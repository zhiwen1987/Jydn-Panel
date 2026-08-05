package system

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"sun-panel/api/api_v1/common/apiReturn"

	"github.com/gin-gonic/gin"
)

type DockerApi struct{}

type dockerContainer struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Image  string `json:"image"`
	State  string `json:"state"`
	Status string `json:"status"`
	Ports  string `json:"ports"`
}

type dockerEngineContainer struct {
	ID     string   `json:"Id"`
	Names  []string `json:"Names"`
	Image  string   `json:"Image"`
	State  string   `json:"State"`
	Status string   `json:"Status"`
	Ports  []struct {
		IP          string `json:"IP"`
		PrivatePort uint16 `json:"PrivatePort"`
		PublicPort  uint16 `json:"PublicPort"`
		Type        string `json:"Type"`
	} `json:"Ports"`
}

type dockerActionRequest struct {
	ID     string `json:"id"`
	Action string `json:"action"`
}

type dockerLogsRequest struct {
	ID   string `json:"id"`
	Tail int    `json:"tail"`
}

var dockerIdentifierPattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$`)

func runDockerCommand(timeout time.Duration, args ...string) (string, error) {
	dockerPath, err := exec.LookPath("docker")
	if err != nil {
		return "", errors.New("docker command not found")
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	command := exec.CommandContext(ctx, dockerPath, args...)
	var stderr bytes.Buffer
	command.Stderr = &stderr
	output, err := command.Output()
	if ctx.Err() == context.DeadlineExceeded {
		return "", errors.New("docker command timed out")
	}
	if err != nil {
		message := strings.TrimSpace(stderr.String())
		if message == "" {
			message = err.Error()
		}
		lowerMessage := strings.ToLower(message)
		switch {
		case strings.Contains(lowerMessage, "permission denied") && strings.Contains(lowerMessage, "docker.sock"):
			message = "无权访问 Docker Socket（/var/run/docker.sock），请将 Jydn-Panel 服务用户加入 docker 组并重启服务"
		case strings.Contains(lowerMessage, "cannot connect to the docker daemon"),
			strings.Contains(lowerMessage, "failed to connect to the docker api"):
			message = "无法连接 Docker 守护进程，请确认 Docker 服务已启动；容器部署还需挂载 /var/run/docker.sock"
		}
		return "", errors.New(message)
	}
	return strings.TrimSpace(string(output)), nil
}

func (a *DockerApi) Info(c *gin.Context) {
	version, err := runDockerCommand(8*time.Second, "version", "--format", "{{.Server.Version}}")
	if err != nil {
		apiReturn.SuccessData(c, gin.H{
			"available": false,
			"message":   err.Error(),
		})
		return
	}

	apiReturn.SuccessData(c, gin.H{
		"available": true,
		"version":   version,
	})
}

func (a *DockerApi) Containers(c *gin.Context) {
	transport := &http.Transport{
		DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
			return (&net.Dialer{}).DialContext(ctx, "unix", "/var/run/docker.sock")
		},
	}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Timeout: 12 * time.Second}
	request, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, "http://docker/containers/json?all=1", nil)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	response, err := client.Do(request)
	if err != nil {
		message := strings.ToLower(err.Error())
		switch {
		case strings.Contains(message, "permission denied"):
			apiReturn.Error(c, "无权访问 Docker Socket（/var/run/docker.sock）")
		case strings.Contains(message, "no such file or directory"):
			apiReturn.Error(c, "未找到 Docker Socket（/var/run/docker.sock），请检查宿主机挂载")
		default:
			apiReturn.Error(c, "无法连接 Docker Engine API："+err.Error())
		}
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		apiReturn.Error(c, fmt.Sprintf("Docker Engine API 返回状态 %d", response.StatusCode))
		return
	}

	rawContainers := make([]dockerEngineContainer, 0)
	if err := json.NewDecoder(response.Body).Decode(&rawContainers); err != nil {
		apiReturn.Error(c, "无法解析 Docker Engine 容器列表")
		return
	}
	containers := make([]dockerContainer, 0, len(rawContainers))
	for _, raw := range rawContainers {
		name := ""
		if len(raw.Names) > 0 {
			name = strings.TrimPrefix(raw.Names[0], "/")
		}
		if name == "" {
			name = raw.ID
			if len(name) > 12 {
				name = name[:12]
			}
		}
		ports := make([]string, 0, len(raw.Ports))
		for _, port := range raw.Ports {
			protocol := port.Type
			if protocol == "" {
				protocol = "tcp"
			}
			if port.PublicPort == 0 {
				ports = append(ports, fmt.Sprintf("%d/%s", port.PrivatePort, protocol))
				continue
			}
			host := port.IP
			if host == "" {
				host = "0.0.0.0"
			}
			ports = append(ports, fmt.Sprintf("%s:%d->%d/%s", host, port.PublicPort, port.PrivatePort, protocol))
		}
		containers = append(containers, dockerContainer{
			ID:     raw.ID,
			Name:   name,
			Image:  raw.Image,
			State:  raw.State,
			Status: raw.Status,
			Ports:  strings.Join(ports, ", "),
		})
	}
	apiReturn.SuccessListData(c, containers, int64(len(containers)))
}

func (a *DockerApi) Action(c *gin.Context) {
	request := dockerActionRequest{}
	if err := c.ShouldBindJSON(&request); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return
	}

	request.ID = strings.TrimSpace(request.ID)
	request.Action = strings.ToLower(strings.TrimSpace(request.Action))
	if !dockerIdentifierPattern.MatchString(request.ID) {
		apiReturn.Error(c, "invalid container identifier")
		return
	}

	allowedActions := map[string]time.Duration{
		"start":   30 * time.Second,
		"stop":    45 * time.Second,
		"restart": 45 * time.Second,
		"pause":   20 * time.Second,
		"unpause": 20 * time.Second,
		"kill":    20 * time.Second,
		"remove":  30 * time.Second,
	}
	timeout, allowed := allowedActions[request.Action]
	if !allowed {
		apiReturn.Error(c, "unsupported docker action")
		return
	}

	command := request.Action
	if request.Action == "remove" {
		command = "rm"
	}
	if _, err := runDockerCommand(timeout, command, request.ID); err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.Success(c)
}

func (a *DockerApi) Logs(c *gin.Context) {
	request := dockerLogsRequest{Tail: 200}
	if err := c.ShouldBindJSON(&request); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return
	}

	request.ID = strings.TrimSpace(request.ID)
	if !dockerIdentifierPattern.MatchString(request.ID) {
		apiReturn.Error(c, "invalid container identifier")
		return
	}
	if request.Tail < 20 {
		request.Tail = 20
	}
	if request.Tail > 1000 {
		request.Tail = 1000
	}

	output, err := runDockerCommand(15*time.Second, "logs", "--tail", strconv.Itoa(request.Tail), request.ID)
	if err != nil {
		apiReturn.Error(c, fmt.Sprintf("unable to read logs: %s", err.Error()))
		return
	}
	apiReturn.SuccessData(c, gin.H{"logs": output})
}

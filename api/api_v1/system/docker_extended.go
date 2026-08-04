package system

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"syscall"
	"time"

	"sun-panel/api/api_v1/common/apiReturn"

	"github.com/gin-gonic/gin"
)

type dockerResourceRequest struct {
	ID        string
	Name      string
	Action    string
	Container string
	Image     string
	Subnet    string
	Gateway   string
	CPUs      float64
	Memory    string
	Force     bool
	Env       []string
	Ports     []string
	Volumes   []string
	Restart   string
}

var dockerImagePattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9_./:@-]{0,255}$`)
var dockerMemoryPattern = regexp.MustCompile(`^[1-9][0-9]*(b|k|m|g|kb|mb|gb)?$`)

func safeDockerValue(value string, max int) bool {
	value = strings.TrimSpace(value)
	return value != "" && len(value) <= max && !strings.ContainsAny(value, "\r\n\x00")
}

func countOutputLines(output string) int {
	count := 0
	scanner := bufio.NewScanner(strings.NewReader(output))
	for scanner.Scan() {
		if strings.TrimSpace(scanner.Text()) != "" {
			count++
		}
	}
	return count
}

func dockerJSONLines(output string) ([]map[string]string, error) {
	list := make([]map[string]string, 0)
	scanner := bufio.NewScanner(strings.NewReader(output))
	scanner.Buffer(make([]byte, 1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		item := map[string]string{}
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	return list, scanner.Err()
}

func readHostMetrics() gin.H {
	metrics := gin.H{}
	if load, err := os.ReadFile("/proc/loadavg"); err == nil {
		fields := strings.Fields(string(load))
		if len(fields) >= 3 {
			metrics["load1"] = fields[0]
			metrics["load5"] = fields[1]
			metrics["load15"] = fields[2]
		}
	}

	if memory, err := os.ReadFile("/proc/meminfo"); err == nil {
		values := map[string]uint64{}
		scanner := bufio.NewScanner(strings.NewReader(string(memory)))
		for scanner.Scan() {
			fields := strings.Fields(scanner.Text())
			if len(fields) >= 2 {
				value, parseErr := strconv.ParseUint(fields[1], 10, 64)
				if parseErr == nil {
					values[strings.TrimSuffix(fields[0], ":")] = value * 1024
				}
			}
		}
		metrics["memoryTotal"] = values["MemTotal"]
		metrics["memoryAvailable"] = values["MemAvailable"]
	}

	var stat syscall.Statfs_t
	if err := syscall.Statfs("/", &stat); err == nil {
		metrics["diskTotal"] = stat.Blocks * uint64(stat.Bsize)
		metrics["diskFree"] = stat.Bavail * uint64(stat.Bsize)
	}

	var rxBytes uint64
	var txBytes uint64
	if network, err := os.ReadFile("/proc/net/dev"); err == nil {
		scanner := bufio.NewScanner(strings.NewReader(string(network)))
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if !strings.Contains(line, ":") {
				continue
			}
			parts := strings.SplitN(line, ":", 2)
			if strings.TrimSpace(parts[0]) == "lo" {
				continue
			}
			fields := strings.Fields(parts[1])
			if len(fields) >= 9 {
				rx, _ := strconv.ParseUint(fields[0], 10, 64)
				tx, _ := strconv.ParseUint(fields[8], 10, 64)
				rxBytes += rx
				txBytes += tx
			}
		}
	}
	metrics["networkRxBytes"] = rxBytes
	metrics["networkTxBytes"] = txBytes
	return metrics
}

func (a *DockerApi) Overview(c *gin.Context) {
	output, err := runDockerCommand(12*time.Second, "info", "--format", "{{json .}}")
	if err != nil {
		apiReturn.SuccessData(c, gin.H{"available": false, "message": err.Error()})
		return
	}

	info := map[string]interface{}{}
	if err := json.Unmarshal([]byte(output), &info); err != nil {
		apiReturn.Error(c, "unable to parse docker info")
		return
	}
	apiVersion, _ := runDockerCommand(8*time.Second, "version", "--format", "{{.Server.APIVersion}}")
	volumes, _ := runDockerCommand(8*time.Second, "volume", "ls", "-q")
	networks, _ := runDockerCommand(8*time.Second, "network", "ls", "-q")

	apiReturn.SuccessData(c, gin.H{
		"available":         true,
		"version":           info["ServerVersion"],
		"apiVersion":        apiVersion,
		"storageDriver":     info["Driver"],
		"loggingDriver":     info["LoggingDriver"],
		"containers":        info["Containers"],
		"containersRunning": info["ContainersRunning"],
		"containersPaused":  info["ContainersPaused"],
		"containersStopped": info["ContainersStopped"],
		"images":            info["Images"],
		"volumes":           countOutputLines(volumes),
		"networks":          countOutputLines(networks),
		"host":              readHostMetrics(),
	})
}

func (a *DockerApi) Events(c *gin.Context) {
	since := time.Now().Add(-15 * time.Minute).Format(time.RFC3339)
	until := time.Now().Format(time.RFC3339)
	output, err := runDockerCommand(12*time.Second, "events", "--since", since, "--until", until, "--format", "{{json .}}")
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	events, err := dockerJSONLines(output)
	if err != nil {
		apiReturn.Error(c, "unable to parse docker events")
		return
	}
	if len(events) > 100 {
		events = events[len(events)-100:]
	}
	apiReturn.SuccessListData(c, events, int64(len(events)))
}

func bindDockerResource(c *gin.Context) (dockerResourceRequest, bool) {
	request := dockerResourceRequest{}
	if err := c.ShouldBindJSON(&request); err != nil {
		apiReturn.ErrorParamFomat(c, err.Error())
		return request, false
	}
	request.ID = strings.TrimSpace(request.ID)
	request.Name = strings.TrimSpace(request.Name)
	request.Image = strings.TrimSpace(request.Image)
	request.Action = strings.ToLower(strings.TrimSpace(request.Action))
	request.Container = strings.TrimSpace(request.Container)
	return request, true
}

func (a *DockerApi) ContainerInspect(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.ID) {
		apiReturn.Error(c, "invalid container identifier")
		return
	}
	output, err := runDockerCommand(12*time.Second, "inspect", request.ID)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	var result []interface{}
	if err := json.Unmarshal([]byte(output), &result); err != nil || len(result) == 0 {
		apiReturn.Error(c, "unable to parse container details")
		return
	}
	apiReturn.SuccessData(c, result[0])
}

func (a *DockerApi) ContainerStats(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.ID) {
		apiReturn.Error(c, "invalid container identifier")
		return
	}
	output, err := runDockerCommand(12*time.Second, "stats", "--no-stream", "--format", "{{json .}}", request.ID)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	stats := map[string]string{}
	if err := json.Unmarshal([]byte(output), &stats); err != nil {
		apiReturn.Error(c, "unable to parse container stats")
		return
	}
	apiReturn.SuccessData(c, stats)
}

func (a *DockerApi) ContainerTop(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.ID) {
		apiReturn.Error(c, "invalid container identifier")
		return
	}
	output, err := runDockerCommand(12*time.Second, "top", request.ID, "-eo", "pid,user,pcpu,pmem,args")
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.SuccessData(c, gin.H{"processes": output})
}

func (a *DockerApi) Rename(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.ID) || !dockerIdentifierPattern.MatchString(request.Name) {
		apiReturn.Error(c, "invalid container identifier or name")
		return
	}
	if _, err := runDockerCommand(20*time.Second, "rename", request.ID, request.Name); err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.Success(c)
}

func (a *DockerApi) UpdateResources(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.ID) {
		apiReturn.Error(c, "invalid container identifier")
		return
	}
	args := []string{"update"}
	if request.CPUs > 0 {
		if request.CPUs > 256 {
			apiReturn.Error(c, "CPU limit is too large")
			return
		}
		args = append(args, "--cpus", strconv.FormatFloat(request.CPUs, 'f', -1, 64))
	}
	if request.Memory != "" {
		request.Memory = strings.ToLower(strings.TrimSpace(request.Memory))
		if !dockerMemoryPattern.MatchString(request.Memory) {
			apiReturn.Error(c, "invalid memory limit")
			return
		}
		args = append(args, "--memory", request.Memory)
	}
	if len(args) == 1 {
		apiReturn.Error(c, "no resource limit provided")
		return
	}
	args = append(args, request.ID)
	if _, err := runDockerCommand(30*time.Second, args...); err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.Success(c)
}

func (a *DockerApi) Images(c *gin.Context) {
	output, err := runDockerCommand(15*time.Second, "image", "ls", "-a", "--no-trunc", "--format", "{{json .}}")
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	images, err := dockerJSONLines(output)
	if err != nil {
		apiReturn.Error(c, "unable to parse image list")
		return
	}
	apiReturn.SuccessListData(c, images, int64(len(images)))
}

func (a *DockerApi) ImageAction(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	target := request.Image
	var args []string
	timeout := 45 * time.Second
	switch request.Action {
	case "pull":
		if !dockerImagePattern.MatchString(target) {
			apiReturn.Error(c, "invalid image name")
			return
		}
		args = []string{"pull", target}
		timeout = 5 * time.Minute
	case "remove":
		if !dockerImagePattern.MatchString(target) {
			apiReturn.Error(c, "invalid image identifier")
			return
		}
		args = []string{"image", "rm"}
		if request.Force {
			args = append(args, "--force")
		}
		args = append(args, target)
	case "prune":
		args = []string{"image", "prune", "-f"}
	default:
		apiReturn.Error(c, "unsupported image action")
		return
	}
	output, err := runDockerCommand(timeout, args...)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.SuccessData(c, gin.H{"output": output})
}

func (a *DockerApi) ImageHistory(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerImagePattern.MatchString(request.Image) {
		apiReturn.Error(c, "invalid image identifier")
		return
	}
	output, err := runDockerCommand(15*time.Second, "history", "--no-trunc", "--format", "{{json .}}", request.Image)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	history, err := dockerJSONLines(output)
	if err != nil {
		apiReturn.Error(c, "unable to parse image history")
		return
	}
	apiReturn.SuccessListData(c, history, int64(len(history)))
}

func validOptionList(values []string) bool {
	for _, value := range values {
		if !safeDockerValue(value, 500) {
			return false
		}
	}
	return true
}

func (a *DockerApi) CreateContainer(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.Name) || !dockerImagePattern.MatchString(request.Image) {
		apiReturn.Error(c, "invalid container name or image")
		return
	}
	if !validOptionList(request.Env) || !validOptionList(request.Ports) || !validOptionList(request.Volumes) {
		apiReturn.Error(c, "invalid container option")
		return
	}
	args := []string{"create", "--name", request.Name}
	if request.Restart != "" {
		allowed := map[string]bool{"no": true, "always": true, "unless-stopped": true, "on-failure": true}
		if !allowed[request.Restart] {
			apiReturn.Error(c, "invalid restart policy")
			return
		}
		args = append(args, "--restart", request.Restart)
	}
	if request.CPUs > 0 {
		args = append(args, "--cpus", strconv.FormatFloat(request.CPUs, 'f', -1, 64))
	}
	if request.Memory != "" {
		request.Memory = strings.ToLower(strings.TrimSpace(request.Memory))
		if !dockerMemoryPattern.MatchString(request.Memory) {
			apiReturn.Error(c, "invalid memory limit")
			return
		}
		args = append(args, "--memory", request.Memory)
	}
	for _, value := range request.Env {
		args = append(args, "-e", value)
	}
	for _, value := range request.Ports {
		args = append(args, "-p", value)
	}
	for _, value := range request.Volumes {
		args = append(args, "-v", value)
	}
	args = append(args, request.Image)
	output, err := runDockerCommand(60*time.Second, args...)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.SuccessData(c, gin.H{"id": output})
}

func (a *DockerApi) DaemonAction(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if request.Action != "start" && request.Action != "stop" && request.Action != "restart" {
		apiReturn.Error(c, "unsupported daemon action")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	var command *exec.Cmd
	if os.Geteuid() == 0 {
		command = exec.CommandContext(ctx, "systemctl", request.Action, "docker")
	} else {
		command = exec.CommandContext(ctx, "sudo", "-n", "systemctl", request.Action, "docker")
	}
	output, err := command.CombinedOutput()
	if err != nil {
		message := strings.TrimSpace(string(output))
		if message == "" {
			message = "Docker daemon control requires root or passwordless sudo permission"
		}
		apiReturn.Error(c, message)
		return
	}
	apiReturn.Success(c)
}

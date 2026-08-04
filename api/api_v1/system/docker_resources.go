package system

import (
	"encoding/json"
	"strings"
	"time"

	"sun-panel/api/api_v1/common/apiReturn"

	"github.com/gin-gonic/gin"
)

func (a *DockerApi) Volumes(c *gin.Context) {
	output, err := runDockerCommand(15*time.Second, "volume", "ls", "--format", "{{json .}}")
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	volumes, err := dockerJSONLines(output)
	if err != nil {
		apiReturn.Error(c, "unable to parse volume list")
		return
	}

	for _, volume := range volumes {
		name := strings.TrimSpace(volume["Name"])
		if !dockerIdentifierPattern.MatchString(name) {
			continue
		}
		inspect, inspectErr := runDockerCommand(5*time.Second, "volume", "inspect", "--format", "{{json .}}", name)
		if inspectErr == nil {
			details := map[string]interface{}{}
			if json.Unmarshal([]byte(inspect), &details) == nil {
				if mountpoint, ok := details["Mountpoint"].(string); ok {
					volume["Mountpoint"] = mountpoint
				}
			}
		}
		usedBy, usedErr := runDockerCommand(5*time.Second, "ps", "-a", "--filter", "volume="+name, "--format", "{{.Names}}")
		if usedErr == nil {
			volume["Containers"] = strings.Join(strings.Fields(usedBy), ", ")
		}
	}
	apiReturn.SuccessListData(c, volumes, int64(len(volumes)))
}

func (a *DockerApi) VolumeAction(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.Name) {
		apiReturn.Error(c, "invalid volume name")
		return
	}
	var args []string
	switch request.Action {
	case "create":
		args = []string{"volume", "create", request.Name}
	case "remove":
		args = []string{"volume", "rm", request.Name}
	default:
		apiReturn.Error(c, "unsupported volume action")
		return
	}
	output, err := runDockerCommand(30*time.Second, args...)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.SuccessData(c, gin.H{"output": output})
}

func (a *DockerApi) Networks(c *gin.Context) {
	output, err := runDockerCommand(15*time.Second, "network", "ls", "--no-trunc", "--format", "{{json .}}")
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	networks, err := dockerJSONLines(output)
	if err != nil {
		apiReturn.Error(c, "unable to parse network list")
		return
	}
	apiReturn.SuccessListData(c, networks, int64(len(networks)))
}

func (a *DockerApi) NetworkInspect(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.Name) {
		apiReturn.Error(c, "invalid network name")
		return
	}
	output, err := runDockerCommand(15*time.Second, "network", "inspect", request.Name)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	var result []interface{}
	if err := json.Unmarshal([]byte(output), &result); err != nil || len(result) == 0 {
		apiReturn.Error(c, "unable to parse network details")
		return
	}
	apiReturn.SuccessData(c, result[0])
}

func (a *DockerApi) NetworkAction(c *gin.Context) {
	request, ok := bindDockerResource(c)
	if !ok {
		return
	}
	if !dockerIdentifierPattern.MatchString(request.Name) {
		apiReturn.Error(c, "invalid network name")
		return
	}

	var args []string
	switch request.Action {
	case "create":
		args = []string{"network", "create", "--driver", "bridge"}
		if request.Subnet != "" {
			if !safeDockerValue(request.Subnet, 64) {
				apiReturn.Error(c, "invalid subnet")
				return
			}
			args = append(args, "--subnet", request.Subnet)
		}
		if request.Gateway != "" {
			if !safeDockerValue(request.Gateway, 64) {
				apiReturn.Error(c, "invalid gateway")
				return
			}
			args = append(args, "--gateway", request.Gateway)
		}
		args = append(args, request.Name)
	case "remove":
		if request.Name == "bridge" || request.Name == "host" || request.Name == "none" {
			apiReturn.Error(c, "system network cannot be removed")
			return
		}
		args = []string{"network", "rm", request.Name}
	case "connect", "disconnect":
		if !dockerIdentifierPattern.MatchString(request.Container) {
			apiReturn.Error(c, "invalid container identifier")
			return
		}
		args = []string{"network", request.Action, request.Name, request.Container}
	default:
		apiReturn.Error(c, "unsupported network action")
		return
	}

	output, err := runDockerCommand(30*time.Second, args...)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	apiReturn.SuccessData(c, gin.H{"output": output})
}

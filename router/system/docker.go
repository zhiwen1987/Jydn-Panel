package system

import (
	"sun-panel/api/api_v1"
	"sun-panel/api/api_v1/middleware"

	"github.com/gin-gonic/gin"
)

func InitDockerRouter(router *gin.RouterGroup) {
	api := api_v1.ApiGroupApp.ApiSystem.DockerApi
	admin := router.Group("", middleware.LoginInterceptor, middleware.AdminInterceptor)
	admin.POST("/system/docker/info", api.Info)
	admin.POST("/system/docker/containers", api.Containers)
	admin.POST("/system/docker/action", api.Action)
	admin.POST("/system/docker/logs", api.Logs)
	admin.POST("/system/docker/overview", api.Overview)
	admin.POST("/system/docker/events", api.Events)
	admin.POST("/system/docker/daemon/action", api.DaemonAction)
	admin.POST("/system/docker/container/inspect", api.ContainerInspect)
	admin.POST("/system/docker/container/stats", api.ContainerStats)
	admin.POST("/system/docker/container/top", api.ContainerTop)
	admin.POST("/system/docker/container/rename", api.Rename)
	admin.POST("/system/docker/container/update", api.UpdateResources)
	admin.POST("/system/docker/container/create", api.CreateContainer)
	admin.POST("/system/docker/images", api.Images)
	admin.POST("/system/docker/image/action", api.ImageAction)
	admin.POST("/system/docker/image/history", api.ImageHistory)
	admin.POST("/system/docker/volumes", api.Volumes)
	admin.POST("/system/docker/volume/action", api.VolumeAction)
	admin.POST("/system/docker/networks", api.Networks)
	admin.POST("/system/docker/network/inspect", api.NetworkInspect)
	admin.POST("/system/docker/network/action", api.NetworkAction)
}

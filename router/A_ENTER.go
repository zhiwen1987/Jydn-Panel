package router

import (
	"strings"
	"sun-panel/global"
	// "sun-panel/router/admin"
	"sun-panel/router/openness"
	"sun-panel/router/panel"
	"sun-panel/router/system"

	"github.com/gin-gonic/gin"
)

// 初始化总路由
func InitRouters(addr string) error {
	router := gin.Default()
	router.Use(webNoCache())
	rootRouter := router.Group("/")
	routerGroup := rootRouter.Group("api")

	// 接口
	system.Init(routerGroup)
	panel.Init(routerGroup)
	openness.Init(routerGroup)

	// WEB文件服务
	{
		webPath := "./web"
		router.StaticFile("/", webPath+"/index.html")
		router.StaticFile("/index.html", webPath+"/index.html")
		router.StaticFile("/sw.js", webPath+"/sw.js")
		router.StaticFile("/service-worker.js", webPath+"/service-worker.js")
		router.Static("/assets", webPath+"/assets")
		router.Static("/custom", webPath+"/custom")
		router.StaticFile("/favicon.ico", webPath+"/favicon.ico")
		router.StaticFile("/favicon.svg", webPath+"/favicon.svg")
	}

	// 上传的文件
	sourcePath := global.Config.GetValueString("base", "source_path")
	router.Static(sourcePath[1:], sourcePath)

	global.Logger.Info("AnGe-Panel is Started.  Listening and serving HTTP on ", addr)
	return router.Run(addr)
}

func webNoCache() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if path == "/" ||
			path == "/index.html" ||
			path == "/sw.js" ||
			path == "/service-worker.js" ||
			path == "/favicon.ico" ||
			path == "/favicon.svg" ||
			strings.HasPrefix(path, "/assets/") ||
			strings.HasPrefix(path, "/custom/") {
			c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
			c.Header("Surrogate-Control", "no-store")
			if path == "/" ||
				path == "/index.html" ||
				path == "/sw.js" ||
				path == "/service-worker.js" {
				c.Header("Clear-Site-Data", `"cache"`)
			}
		}
		c.Next()
	}
}

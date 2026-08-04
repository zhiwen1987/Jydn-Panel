package system

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"sun-panel/api/api_v1/common/apiReturn"
	"sun-panel/lib/cmn"

	"github.com/gin-gonic/gin"
)

type About struct{}

var githubRepositoryPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`)
var nonVersionNumberPattern = regexp.MustCompile(`[^0-9]+`)

type githubLatestRelease struct {
	TagName     string `json:"tag_name"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
}

func (a *About) Get(c *gin.Context) {
	version := cmn.GetSysVersionInfo()
	apiReturn.SuccessData(c, gin.H{
		"versionName": version.Version,
		"versionCode": version.Version_code,
	})
}

func versionParts(version string) []int {
	fields := nonVersionNumberPattern.Split(strings.TrimSpace(strings.TrimLeft(version, "vV")), -1)
	parts := make([]int, 0, len(fields))
	for _, field := range fields {
		if field == "" {
			continue
		}
		value, err := strconv.Atoi(field)
		if err == nil {
			parts = append(parts, value)
		}
	}
	return parts
}

func isNewerVersion(latest string, current string) bool {
	left := versionParts(latest)
	right := versionParts(current)
	length := len(left)
	if len(right) > length {
		length = len(right)
	}
	for index := 0; index < length; index++ {
		var latestPart, currentPart int
		if index < len(left) {
			latestPart = left[index]
		}
		if index < len(right) {
			currentPart = right[index]
		}
		if latestPart != currentPart {
			return latestPart > currentPart
		}
	}
	return false
}

func (a *About) CheckVersion(c *gin.Context) {
	repository := strings.TrimSpace(os.Getenv("JYDN_GITHUB_REPOSITORY"))
	if repository == "" {
		repository = "zhiwen1987/Jydn-Panel"
	}
	if !githubRepositoryPattern.MatchString(repository) {
		apiReturn.Error(c, "JYDN_GITHUB_REPOSITORY 格式无效")
		return
	}

	request, err := http.NewRequest(http.MethodGet, fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repository), nil)
	if err != nil {
		apiReturn.Error(c, err.Error())
		return
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	request.Header.Set("User-Agent", "Jydn-Panel-Version-Checker")
	token := strings.TrimSpace(os.Getenv("JYDN_GITHUB_TOKEN"))
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}

	response, err := (&http.Client{Timeout: 12 * time.Second}).Do(request)
	if err != nil {
		apiReturn.Error(c, "GitHub 版本检查失败："+err.Error())
		return
	}
	defer response.Body.Close()
	if response.StatusCode == http.StatusNotFound && token == "" {
		apiReturn.Error(c, "私有 GitHub 仓库需要配置只读 JYDN_GITHUB_TOKEN 才能检查版本")
		return
	}
	if response.StatusCode != http.StatusOK {
		apiReturn.Error(c, fmt.Sprintf("GitHub 返回状态 %d", response.StatusCode))
		return
	}

	latest := githubLatestRelease{}
	if err := json.NewDecoder(response.Body).Decode(&latest); err != nil || strings.TrimSpace(latest.TagName) == "" {
		apiReturn.Error(c, "无法解析 GitHub 最新版本")
		return
	}
	current := cmn.GetSysVersionInfo().Version
	apiReturn.SuccessData(c, gin.H{
		"currentVersion": current,
		"latestVersion":  latest.TagName,
		"hasUpdate":      isNewerVersion(latest.TagName, current),
		"releaseUrl":     latest.HTMLURL,
		"publishedAt":    latest.PublishedAt,
		"repository":     repository,
	})
}

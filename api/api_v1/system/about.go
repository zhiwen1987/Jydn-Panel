package system

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"sun-panel/api/api_v1/common/apiReturn"
	"sun-panel/global"
	"sun-panel/lib/cmn"
	"sun-panel/models"

	"github.com/gin-gonic/gin"
)

type About struct{}

var githubRepositoryPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$`)
var nonVersionNumberPattern = regexp.MustCompile(`[^0-9]+`)
var projectVersionPattern = regexp.MustCompile(`^[0-9]+\.[0-9]{2}$`)

type githubLatestRelease struct {
	TagName     string `json:"tag_name"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
}

func githubPublicLatestRelease(repository string) (githubLatestRelease, error) {
	endpoints := []string{
		fmt.Sprintf("https://cdn.jsdelivr.net/gh/%s@main/VERSION", repository),
		fmt.Sprintf("https://fastly.jsdelivr.net/gh/%s@main/VERSION", repository),
	}
	var lastErr error
	for _, endpoint := range endpoints {
		request, err := http.NewRequest(http.MethodGet, endpoint, nil)
		if err != nil {
			lastErr = err
			continue
		}
		request.Header.Set("User-Agent", "Jydn-Panel-Version-Checker")
		response, err := (&http.Client{Timeout: 12 * time.Second}).Do(request)
		if err != nil {
			lastErr = err
			continue
		}
		content, readErr := io.ReadAll(io.LimitReader(response.Body, 64))
		response.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}
		if response.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("公开 VERSION 返回状态 %d", response.StatusCode)
			continue
		}
		version := strings.TrimSpace(string(content))
		if !projectVersionPattern.MatchString(version) {
			lastErr = fmt.Errorf("公开 VERSION 格式无效")
			continue
		}
		tag := "v" + version
		return githubLatestRelease{
			TagName: tag,
			HTMLURL: fmt.Sprintf("https://github.com/%s/releases/tag/%s", repository, tag),
		}, nil
	}
	if lastErr == nil {
		lastErr = fmt.Errorf("没有可用的公开 VERSION 来源")
	}
	return githubLatestRelease{}, lastErr
}

func githubAccessToken() string {
	if token := strings.TrimSpace(os.Getenv("JYDN_GITHUB_TOKEN")); token != "" {
		return token
	}
	paths := []string{"/data/conf/github-token", "./conf/github-token"}
	if configured := strings.TrimSpace(os.Getenv("JYDN_GITHUB_TOKEN_FILE")); configured != "" {
		paths = []string{configured}
	}
	for _, path := range paths {
		content, err := os.ReadFile(path)
		if err != nil {
			continue
		}
		if token := strings.TrimSpace(string(content)); token != "" {
			return token
		}
	}
	return ""
}

func (a *About) Get(c *gin.Context) {
	version := cmn.GetSysVersionInfo()
	apiReturn.SuccessData(c, gin.H{
		"versionName": version.Version,
		"versionCode": version.Version_code,
	})
}

func loadSiteAppearance() gin.H {
	appearance := gin.H{}
	admin := models.User{}
	if err := global.Db.Select("id").Where("role = ?", 1).Order("id ASC").First(&admin).Error; err == nil {
		config := models.UserConfig{}
		if err := global.Db.Where("user_id = ?", admin.ID).First(&config).Error; err == nil {
			panel := map[string]interface{}{}
			if json.Unmarshal([]byte(config.PanelJson), &panel) == nil {
				for _, key := range []string{"faviconImageSrc", "logoImageSrc", "logoText", "poweredByText", "poweredByUrl", "poweredByHtml"} {
					if value, ok := panel[key]; ok {
						appearance[key] = value
					}
				}
			}
		}
	}
	return appearance
}

func (a *About) SiteAppearance(c *gin.Context) {
	apiReturn.SuccessData(c, loadSiteAppearance())
}

func (a *About) SiteFavicon(c *gin.Context) {
	appearance := loadSiteAppearance()
	source, _ := appearance["logoImageSrc"].(string)
	if strings.TrimSpace(source) == "" {
		source, _ = appearance["faviconImageSrc"].(string)
	}
	source = strings.TrimSpace(source)
	if source == "" || (!strings.HasPrefix(source, "/") && !strings.HasPrefix(source, "http://") && !strings.HasPrefix(source, "https://")) {
		source = "/favicon.svg"
	}
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
	c.Header("Pragma", "no-cache")
	c.Redirect(http.StatusTemporaryRedirect, source)
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
	token := githubAccessToken()
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}

	latest := githubLatestRelease{}
	if token == "" {
		latest, _ = githubPublicLatestRelease(repository)
	}
	var apiErr error
	apiStatus := 0
	rateLimitRemaining := ""
	if strings.TrimSpace(latest.TagName) == "" {
		response, requestErr := (&http.Client{Timeout: 12 * time.Second}).Do(request)
		apiErr = requestErr
		if response != nil {
			defer response.Body.Close()
			apiStatus = response.StatusCode
			rateLimitRemaining = strings.TrimSpace(response.Header.Get("X-RateLimit-Remaining"))
		}
		if apiErr == nil && apiStatus == http.StatusOK {
			if err := json.NewDecoder(response.Body).Decode(&latest); err != nil || strings.TrimSpace(latest.TagName) == "" {
				apiErr = fmt.Errorf("无法解析 GitHub 最新版本")
			}
		}
	}
	if strings.TrimSpace(latest.TagName) == "" {
		fallback, fallbackErr := githubPublicLatestRelease(repository)
		if fallbackErr == nil {
			latest = fallback
		} else {
			switch {
			case apiErr != nil:
				apiReturn.Error(c, "GitHub 版本检查失败："+apiErr.Error())
			case apiStatus == http.StatusUnauthorized && token != "":
				apiReturn.Error(c, "GitHub Token 无效，请更新或删除 conf/github-token")
			case apiStatus == http.StatusForbidden && rateLimitRemaining == "0":
				apiReturn.Error(c, "GitHub API 请求已达限额，请稍后重试；只读 Token 为可选配置")
			case apiStatus == http.StatusForbidden:
				apiReturn.Error(c, "GitHub 拒绝访问版本信息，请检查网络代理或 Token 权限")
			case apiStatus == http.StatusNotFound:
				apiReturn.Error(c, "GitHub 仓库不存在或尚未发布正式 Release")
			default:
				apiReturn.Error(c, fmt.Sprintf("GitHub 版本检查失败（API 状态 %d）", apiStatus))
			}
			return
		}
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

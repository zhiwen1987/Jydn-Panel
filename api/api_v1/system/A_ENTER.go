package system

type ApiSystem struct {
	DockerApi       DockerApi
	About           About
	LoginApi        LoginApi
	UserApi         UserApi
	FileApi         FileApi
	NoticeApi       NoticeApi
	ModuleConfigApi ModuleConfigApi
}

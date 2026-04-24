// Code generated for package assets by go-bindata DO NOT EDIT. (@generated)
// sources:
// assets/bindata.go
// assets/conf.example.ini
// assets/lang/en-us.ini
// assets/lang/zh-cn.ini
// assets/readme.md
// assets/version
package assets

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func bindataRead(data []byte, name string) ([]byte, error) {
	gz, err := gzip.NewReader(bytes.NewBuffer(data))
	if err != nil {
		return nil, fmt.Errorf("Read %q: %v", name, err)
	}

	var buf bytes.Buffer
	_, err = io.Copy(&buf, gz)
	clErr := gz.Close()

	if err != nil {
		return nil, fmt.Errorf("Read %q: %v", name, err)
	}
	if clErr != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

type asset struct {
	bytes []byte
	info  os.FileInfo
}

type bindataFileInfo struct {
	name    string
	size    int64
	mode    os.FileMode
	modTime time.Time
}

// Name return file name
func (fi bindataFileInfo) Name() string {
	return fi.name
}

// Size return file size
func (fi bindataFileInfo) Size() int64 {
	return fi.size
}

// Mode return file mode
func (fi bindataFileInfo) Mode() os.FileMode {
	return fi.mode
}

// Mode return file modify time
func (fi bindataFileInfo) ModTime() time.Time {
	return fi.modTime
}

// IsDir return file whether a directory
func (fi bindataFileInfo) IsDir() bool {
	return fi.mode&os.ModeDir != 0
}

// Sys return file is sys mode
func (fi bindataFileInfo) Sys() interface{} {
	return nil
}

var _assetsBindataGo = []byte("\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\xff\x01\x00\x00\xff\xff\x00\x00\x00\x00\x00\x00\x00\x00")

func assetsBindataGoBytes() ([]byte, error) {
	return bindataRead(
		_assetsBindataGo,
		"assets/bindata.go",
	)
}

func assetsBindataGo() (*asset, error) {
	bytes, err := assetsBindataGoBytes()
	if err != nil {
		return nil, err
	}

	info := bindataFileInfo{name: "assets/bindata.go", size: 0, mode: os.FileMode(436), modTime: time.Unix(1772513061, 0)}
	a := &asset{bytes: bytes, info: info}
	return a, nil
}

var _assetsConfExampleIni = []byte("\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\x03\x95\x52\x4d\x6f\xdb\x30\x0c\xbd\xf3\x57\x10\xf0\xa1\xed\xc5\x76\x16\xac\xc5\x02\xf8\xb2\x15\xbb\x0d\xd8\x80\x01\x3b\x14\x86\x41\x4b\x74\x2d\xc0\x96\x1c\x89\x6a\xd6\x7f\x3f\x48\x4e\x96\x7d\x35\x43\x75\x92\xc8\xf7\x48\xea\x3d\x16\xd8\xfc\xf3\x40\x81\xef\x29\x18\x85\xca\xd9\xc1\x3c\x46\x4f\x62\x9c\x85\xe2\x25\xf8\x43\x4f\x81\x5b\x28\xf0\x1b\xf7\xe8\xa3\xc5\xc5\x79\x29\xf1\x9e\x07\x8a\x93\xec\xb6\x75\xfd\x16\x46\x91\xa5\x4b\xf1\x26\x3f\x0b\xbc\x27\xa1\xc4\x43\xed\xcd\x13\x7b\x7c\x98\x9f\xc3\x7e\xaa\xc2\x7e\x32\xc2\xd7\x47\xee\x4d\x0b\xfa\x88\xeb\x32\xae\x59\xf3\x50\xe0\x07\x52\xe3\x99\xec\x59\x9b\x50\xcd\x3c\x3b\xff\xfc\x0b\x59\x25\xd0\x91\xb9\x26\xa1\xc0\x2f\x91\xe3\x7f\x99\xfb\x04\xfa\x93\xf9\xd1\x4c\x8c\xb9\x26\x2e\x24\x23\x5e\x7f\x9e\x38\x7d\x21\x08\x79\xc1\x83\x91\x11\x65\x64\x54\xd1\x7b\xb6\xb2\x62\xae\xca\xea\xea\x26\x69\x43\xde\x1a\xfb\xb8\xc3\xaf\x23\xe3\x60\x26\x0e\x28\x23\x09\x8e\xf4\xc4\xd8\x33\x5b\x8c\xcb\xe4\x48\xb3\x46\x1a\x84\x7d\xae\x34\x3b\x6d\x06\xa3\xb2\xfe\xa8\xc8\x5a\x27\xd8\x33\x92\x52\x1c\x02\x6b\x08\x2e\x7a\xc5\x5d\x6a\xd4\x94\xd5\x5a\x20\xfc\x3d\x68\x79\x02\x0a\xcf\xcb\x09\xed\xa3\x15\x33\x73\x95\x62\xf0\xb2\xb9\x05\x7e\x4a\xc6\xa0\xfe\xdd\xaf\x0b\xdb\x90\x8d\x6c\x61\x74\x41\x9a\xcd\x9b\xbb\xb2\x2e\xeb\x72\x03\xab\xf7\xdb\xfa\x16\x62\x60\x6f\x69\xe6\xc6\x3b\x27\xb0\x50\x08\x07\xe7\xf5\xfa\xd2\x7d\x97\x53\x21\xda\x6e\x21\xcb\x13\x1c\xc8\x48\x97\x06\x75\x51\x9a\x4d\x5d\x5f\x1c\x75\xdd\x8e\x57\xcc\xba\x12\x5a\x48\x86\x9c\x84\x39\xb1\x7f\x5e\x4a\xdd\x5f\xec\x9a\x57\xe8\x15\x4d\x33\xbe\x05\xd2\xda\x73\x08\x67\x8d\x76\xb7\xdb\xbb\x77\x67\x41\x60\xf1\x3c\x98\xef\x67\x2d\x76\xa0\xfb\xa6\x86\x1f\x9a\x86\xd6\xe9\xb7\x03\x00\x00")

func assetsConfExampleIniBytes() ([]byte, error) {
	return bindataRead(
		_assetsConfExampleIni,
		"assets/conf.example.ini",
	)
}

func assetsConfExampleIni() (*asset, error) {
	bytes, err := assetsConfExampleIniBytes()
	if err != nil {
		return nil, err
	}

	info := bindataFileInfo{name: "assets/conf.example.ini", size: 951, mode: os.FileMode(436), modTime: time.Unix(1772461312, 0)}
	a := &asset{bytes: bytes, info: info}
	return a, nil
}

var _assetsLangEnUsIni = []byte("\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\x03\x8b\xce\x49\xcc\x4b\x8f\xcf\xcc\x4b\xcb\x8f\xe5\x2a\x4b\x2d\x2a\xce\xcc\xcf\xb3\x35\xd4\x33\x30\xe0\x2a\xce\x4f\x2b\x89\xcf\xc9\x2f\x8f\x4f\xcc\x01\x91\x70\x39\x2e\x00\xc7\x43\x1c\xbb\x32\x00\x00\x00")

func assetsLangEnUsIniBytes() ([]byte, error) {
	return bindataRead(
		_assetsLangEnUsIni,
		"assets/lang/en-us.ini",
	)
}

func assetsLangEnUsIni() (*asset, error) {
	bytes, err := assetsLangEnUsIniBytes()
	if err != nil {
		return nil, err
	}

	info := bindataFileInfo{name: "assets/lang/en-us.ini", size: 50, mode: os.FileMode(436), modTime: time.Unix(1772461312, 0)}
	a := &asset{bytes: bytes, info: info}
	return a, nil
}

var _assetsLangZhCnIni = []byte("\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\x03\x8b\xce\x49\xcc\x4b\x8f\xcf\xcc\x4b\xcb\x8f\xe5\x2a\x4b\x2d\x2a\xce\xcc\xcf\xb3\x35\xd4\x33\x30\xe0\x2a\xce\x4f\x2b\x89\xcf\xc9\x2f\x8f\x4f\xcc\x01\x91\x70\x39\x2e\x00\xc7\x43\x1c\xbb\x32\x00\x00\x00")

func assetsLangZhCnIniBytes() ([]byte, error) {
	return bindataRead(
		_assetsLangZhCnIni,
		"assets/lang/zh-cn.ini",
	)
}

func assetsLangZhCnIni() (*asset, error) {
	bytes, err := assetsLangZhCnIniBytes()
	if err != nil {
		return nil, err
	}

	info := bindataFileInfo{name: "assets/lang/zh-cn.ini", size: 50, mode: os.FileMode(436), modTime: time.Unix(1772461312, 0)}
	a := &asset{bytes: bytes, info: info}
	return a, nil
}

var _assetsReadmeMd = []byte("\x1f\x8b\x08\x00\x00\x00\x00\x00\x00\xff\xa4\x54\x4d\x6f\xe3\x54\x14\xdd\xbf\x5f\xf1\xa4\xec\x2a\xc5\x56\x3a\x2a\x19\x46\x9a\x0a\x56\x61\x07\x0b\x24\x16\x08\xc9\x4e\xe2\x3a\x06\xd7\x8e\xc6\x4e\x23\x21\x16\x9e\xc9\xf7\x47\xe3\x04\xd2\x40\x43\x3a\xe9\x30\x93\x12\x3a\x34\x89\xa8\x5a\xdc\xc4\x51\xff\x8c\xef\x7b\xf6\xaa\x7f\x01\xd9\x6e\x86\x14\xaa\x0a\x34\xbb\xa7\xf7\xee\xbb\xe7\xdc\x73\xcf\xbd\x91\x08\x86\x59\xd9\x3b\x3a\x24\xc6\x73\xf7\xa2\x48\xe6\x6d\x6a\xf7\xdc\x69\x87\x54\xdb\xa2\x4a\x7a\x15\x67\x71\x49\x6a\x3f\x40\xb3\x04\xd5\x19\x98\x53\x52\xfb\xd5\x7d\xd5\x0c\xef\xa1\x5c\x42\x08\x5a\x43\x5a\xab\x92\x83\x43\x3a\x6e\x90\xa3\x11\x99\xb7\x9f\x64\x74\x3d\xab\x3d\x61\xd9\xa4\xac\x8a\x8c\xa0\x48\xbc\xa2\x0b\xfc\x2e\x93\x52\x77\xd9\x1c\xab\xe5\x14\x36\xa5\x2a\xba\xa0\xe8\xec\x66\x2c\x86\xd0\x36\x76\xac\xb9\x33\x2f\xd3\x89\x01\xcd\x9e\x57\x18\xd3\xe5\x1f\xf0\x7d\x13\x2a\x26\xcc\x3a\x50\x99\x7b\xdd\x43\xda\x2f\x42\xe5\x98\xb6\x2a\x37\x76\x13\x66\x65\xa8\xed\xd3\xb7\xd3\x87\xb9\x39\xd6\xd9\x8d\xdd\x24\x03\x83\x2e\xaa\x74\xdc\x80\xb9\x09\x66\x07\xac\x82\x73\xd5\x80\x76\x0b\xcc\x53\x32\xa8\x39\x96\xe1\x58\xa7\xff\xf8\x88\x50\x24\x12\xc1\x31\x06\xc3\xa4\xe6\xbe\x2e\xa1\x8d\x0d\x4c\xce\xc7\xa4\x68\xde\xd8\x7d\x8e\x61\x18\x0e\xae\x4b\xde\xab\x05\x58\x27\x8e\x55\xc7\x1b\x1b\x88\xe3\x38\x4d\xcb\x20\x51\xc5\xa2\xa0\x63\x51\xd2\x33\xb9\x64\x50\xab\xa8\x46\x93\x92\x92\xe6\x75\x7e\xfd\xc8\x30\xcc\x3d\xb1\x82\xcc\x7f\xcb\x3f\x93\xd7\x02\xa3\xbc\xa6\x09\xfa\x8e\x16\x7c\x40\x11\x2c\xaa\xbe\xcc\x83\xdf\xb7\x9f\xc6\x98\x58\x1c\x3b\xcb\x6b\xda\x1d\x4b\x8a\xae\xf1\xb2\x4c\x7a\x57\x60\x9b\x7e\x5a\x49\xd1\x74\x5e\x96\x71\x94\xc7\xd1\xbd\xff\x44\xe6\x23\x99\xd7\x05\x4d\x7f\xf0\xf3\xc3\xec\x56\x19\x38\x8e\x0b\xb4\xdb\x5c\x69\x47\xaa\x6d\xa8\x0f\x7d\xb9\x67\x65\xcc\x25\x3e\xfd\xec\xe3\xcf\x3f\x61\x93\x92\xc2\x61\xa8\x1f\x43\x69\x44\x5b\x53\xf8\xa5\x00\xe6\x4f\x5e\xc5\x44\x08\xcc\x17\xae\x51\x80\x76\xd1\xad\x9c\xd2\xf3\x05\x5d\x0c\xd7\xdf\xbd\xd2\x3e\x5d\x4e\x60\xff\x1c\xcc\x29\x0a\x7b\xf4\x88\xc1\xd0\x6a\x50\xfb\xb7\xd0\xbc\x61\xfb\x30\x54\x67\x38\x20\x47\x7f\x9e\xc0\xf2\x00\x39\x8b\x91\x63\x35\xa0\xb3\x74\x16\x6f\x60\x30\xfe\x42\x52\xd2\x6a\x5e\xa3\xfd\x22\x97\x55\xf3\xc2\x33\x2d\x23\xc8\x32\x07\xe6\xd4\x2d\x2c\x1d\xbb\x4f\xea\x23\xaf\x7b\xe8\xdb\xcc\x9c\x86\x12\x73\xa9\xdd\x34\x17\x1a\x64\xd5\xea\x08\x06\xdb\x00\xb3\x13\xf2\xf3\x83\xaf\x2e\xbd\xa3\x97\x74\x30\x84\xc9\x4b\x98\x95\x49\xcd\x20\x83\x5a\xc8\x27\x1c\xa6\x1b\xbb\xe9\x5c\x4f\x48\xf7\x6a\x9d\xaa\x0f\xb1\x18\x81\x59\x27\x3f\x5e\xd2\xee\x90\x1c\x54\xd1\xbf\x05\xc6\xd1\xb4\x90\xcc\x89\x38\xaa\x3e\x0d\x6e\x34\xf6\x36\x80\x11\x55\x1c\xcd\x7e\x23\xde\x5e\x63\x4d\xe7\x75\x29\xe5\xf7\x03\xef\x49\x42\x3e\x38\x44\x30\xbc\xe9\x3b\xd6\xe9\xfb\xe4\xbd\x7d\xf5\xd3\xf9\x36\x24\x67\xaf\xc1\x36\xdf\x55\x7e\x4f\x55\xed\x96\x37\x30\xdc\x93\xe7\x5e\x65\x9f\xf4\x66\x61\xfd\xf7\x12\xf8\x3f\xc8\xbe\xb7\xb6\xef\x80\x87\x20\x18\x5a\x0b\xd2\xaa\x71\xab\x72\xb8\xc0\x1a\x11\x1c\x9a\x89\xf4\x2a\xf4\xed\x31\x4a\xa8\xf8\x3b\x9c\x50\xb1\x3b\x3d\x73\xc7\x46\xb8\x31\xd6\x29\x87\x5d\x80\x93\x17\xce\xf2\xc0\xb1\x5a\x09\x49\x71\x2c\xc3\xbd\xf8\x33\x34\x40\xe2\x1d\x75\xb4\x5a\x6c\xf9\x7c\x9e\xf9\x5a\xe2\x15\x2d\x93\x0b\xe6\x23\xcb\xf2\xf1\x9d\xad\xc7\x8f\xb7\x3e\x88\x7f\x28\xec\x20\xf4\xa5\xa8\xca\xbc\x22\x7e\x95\x50\xa1\x5c\x82\x8b\xe6\xfa\x76\xfd\x5b\x09\x7f\xab\x05\x73\x02\x66\x3d\x84\xba\x03\x90\x52\xfc\xfd\xa9\x05\x00\x32\xaf\xa4\xf7\xd8\x2c\x1b\x8b\x6d\xc5\xe3\x9b\xb1\x47\x4c\x46\xdf\x95\xff\x0a\x00\x00\xff\xff\xf7\xb4\x46\x06\xba\x05\x00\x00")

func assetsReadmeMdBytes() ([]byte, error) {
	return bindataRead(
		_assetsReadmeMd,
		"assets/readme.md",
	)
}

func assetsReadmeMd() (*asset, error) {
	bytes, err := assetsReadmeMdBytes()
	if err != nil {
		return nil, err
	}

	info := bindataFileInfo{name: "assets/readme.md", size: 1466, mode: os.FileMode(436), modTime: time.Unix(1772461312, 0)}
	a := &asset{bytes: bytes, info: info}
	return a, nil
}

var _assetsVersion = []byte("\x1f\x8b\x08\x00\x00\x00\x00\x00\x02\x03\x33\x34\x30\xa8\x31\xd4\x33\x30\xe0\x02\x00\xec\x88\x59\x49\x09\x00\x00\x00")

func assetsVersionBytes() ([]byte, error) {
	return bindataRead(
		_assetsVersion,
		"assets/version",
	)
}

func assetsVersion() (*asset, error) {
	bytes, err := assetsVersionBytes()
	if err != nil {
		return nil, err
	}

	info := bindataFileInfo{name: "assets/version", size: 9, mode: os.FileMode(436), modTime: time.Unix(1773993600, 0)}
	a := &asset{bytes: bytes, info: info}
	return a, nil
}

// Asset loads and returns the asset for the given name.
// It returns an error if the asset could not be found or
// could not be loaded.
func Asset(name string) ([]byte, error) {
	cannonicalName := strings.Replace(name, "\\", "/", -1)
	if f, ok := _bindata[cannonicalName]; ok {
		a, err := f()
		if err != nil {
			return nil, fmt.Errorf("Asset %s can't read by error: %v", name, err)
		}
		return a.bytes, nil
	}
	return nil, fmt.Errorf("Asset %s not found", name)
}

// MustAsset is like Asset but panics when Asset would return an error.
// It simplifies safe initialization of global variables.
func MustAsset(name string) []byte {
	a, err := Asset(name)
	if err != nil {
		panic("asset: Asset(" + name + "): " + err.Error())
	}

	return a
}

// AssetInfo loads and returns the asset info for the given name.
// It returns an error if the asset could not be found or
// could not be loaded.
func AssetInfo(name string) (os.FileInfo, error) {
	cannonicalName := strings.Replace(name, "\\", "/", -1)
	if f, ok := _bindata[cannonicalName]; ok {
		a, err := f()
		if err != nil {
			return nil, fmt.Errorf("AssetInfo %s can't read by error: %v", name, err)
		}
		return a.info, nil
	}
	return nil, fmt.Errorf("AssetInfo %s not found", name)
}

// AssetNames returns the names of the assets.
func AssetNames() []string {
	names := make([]string, 0, len(_bindata))
	for name := range _bindata {
		names = append(names, name)
	}
	return names
}

// _bindata is a table, holding each asset generator, mapped to its name.
var _bindata = map[string]func() (*asset, error){
	"assets/bindata.go":       assetsBindataGo,
	"assets/conf.example.ini": assetsConfExampleIni,
	"assets/lang/en-us.ini":   assetsLangEnUsIni,
	"assets/lang/zh-cn.ini":   assetsLangZhCnIni,
	"assets/readme.md":        assetsReadmeMd,
	"assets/version":          assetsVersion,
}

// AssetDir returns the file names below a certain
// directory embedded in the file by go-bindata.
// For example if you run go-bindata on data/... and data contains the
// following hierarchy:
//     data/
//       foo.txt
//       img/
//         a.png
//         b.png
// then AssetDir("data") would return []string{"foo.txt", "img"}
// AssetDir("data/img") would return []string{"a.png", "b.png"}
// AssetDir("foo.txt") and AssetDir("notexist") would return an error
// AssetDir("") will return []string{"data"}.
func AssetDir(name string) ([]string, error) {
	node := _bintree
	if len(name) != 0 {
		cannonicalName := strings.Replace(name, "\\", "/", -1)
		pathList := strings.Split(cannonicalName, "/")
		for _, p := range pathList {
			node = node.Children[p]
			if node == nil {
				return nil, fmt.Errorf("Asset %s not found", name)
			}
		}
	}
	if node.Func != nil {
		return nil, fmt.Errorf("Asset %s not found", name)
	}
	rv := make([]string, 0, len(node.Children))
	for childName := range node.Children {
		rv = append(rv, childName)
	}
	return rv, nil
}

type bintree struct {
	Func     func() (*asset, error)
	Children map[string]*bintree
}

var _bintree = &bintree{nil, map[string]*bintree{
	"assets": &bintree{nil, map[string]*bintree{
		"bindata.go":       &bintree{assetsBindataGo, map[string]*bintree{}},
		"conf.example.ini": &bintree{assetsConfExampleIni, map[string]*bintree{}},
		"lang": &bintree{nil, map[string]*bintree{
			"en-us.ini": &bintree{assetsLangEnUsIni, map[string]*bintree{}},
			"zh-cn.ini": &bintree{assetsLangZhCnIni, map[string]*bintree{}},
		}},
		"readme.md": &bintree{assetsReadmeMd, map[string]*bintree{}},
		"version":   &bintree{assetsVersion, map[string]*bintree{}},
	}},
}}

// RestoreAsset restores an asset under the given directory
func RestoreAsset(dir, name string) error {
	data, err := Asset(name)
	if err != nil {
		return err
	}
	info, err := AssetInfo(name)
	if err != nil {
		return err
	}
	err = os.MkdirAll(_filePath(dir, filepath.Dir(name)), os.FileMode(0755))
	if err != nil {
		return err
	}
	err = ioutil.WriteFile(_filePath(dir, name), data, info.Mode())
	if err != nil {
		return err
	}
	err = os.Chtimes(_filePath(dir, name), info.ModTime(), info.ModTime())
	if err != nil {
		return err
	}
	return nil
}

// RestoreAssets restores an asset under the given directory recursively
func RestoreAssets(dir, name string) error {
	children, err := AssetDir(name)
	// File
	if err != nil {
		return RestoreAsset(dir, name)
	}
	// Dir
	for _, child := range children {
		err = RestoreAssets(dir, filepath.Join(name, child))
		if err != nil {
			return err
		}
	}
	return nil
}

func _filePath(dir, name string) string {
	cannonicalName := strings.Replace(name, "\\", "/", -1)
	return filepath.Join(append([]string{dir}, strings.Split(cannonicalName, "/")...)...)
}

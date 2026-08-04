//go:build windows

package system

import "golang.org/x/sys/windows"

func readDiskUsage() (total uint64, free uint64, ok bool) {
	path, err := windows.UTF16PtrFromString(`C:\`)
	if err != nil {
		return 0, 0, false
	}

	var available uint64
	var totalBytes uint64
	var totalFree uint64
	if err := windows.GetDiskFreeSpaceEx(path, &available, &totalBytes, &totalFree); err != nil {
		return 0, 0, false
	}

	return totalBytes, totalFree, true
}

/**
 * Minimal ambient declarations for the File System Access API surface this
 * app uses. TS 5.9's DOM lib ships FileSystemFileHandle but not the picker
 * functions or permission methods.
 */
interface FileSystemHandlePermissionDescriptor {
  mode: 'read' | 'readwrite';
}

interface FileSystemHandle {
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface Window {
  showSaveFilePicker(options?: {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }): Promise<FileSystemFileHandle>;
  showOpenFilePicker(options?: {
    types?: FilePickerAcceptType[];
    multiple?: boolean;
  }): Promise<FileSystemFileHandle[]>;
}

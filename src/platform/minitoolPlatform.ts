import {
  resolveMiniToolBridge,
  resolveMiniToolPostNoteBridge,
  savePngToMiniToolAlbum,
  submitPostNoteToMiniTool,
  type MiniToolHost,
  type MiniToolImageSaveResult,
  type MiniToolPostNoteResult,
} from './minitoolBridge';
import type { MiniToolPostNotePayload } from '../minitool/postNotePayload';

export interface MiniToolPlatformServices {
  readonly runtime: 'minitool';
  isAlbumBridgeAvailable(): boolean;
  savePngToAlbum(dataUri: string): Promise<MiniToolImageSaveResult>;
  isPostNoteBridgeAvailable(): boolean;
  submitPostNote(payload: MiniToolPostNotePayload): Promise<MiniToolPostNoteResult>;
}

export function createMiniToolPlatformServices(host: MiniToolHost): MiniToolPlatformServices {
  return {
    runtime: 'minitool',
    isAlbumBridgeAvailable() {
      return resolveMiniToolBridge(host) !== null;
    },
    async savePngToAlbum(dataUri) {
      return await savePngToMiniToolAlbum(dataUri, host);
    },
    isPostNoteBridgeAvailable() {
      return resolveMiniToolPostNoteBridge(host) !== null;
    },
    async submitPostNote(payload) {
      return await submitPostNoteToMiniTool(payload, host);
    },
  };
}

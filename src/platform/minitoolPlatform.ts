import {
  resolveMiniToolBridge,
  savePngToMiniToolAlbum,
  type MiniToolHost,
  type MiniToolImageSaveResult,
} from './minitoolBridge';

export interface MiniToolPlatformServices {
  readonly runtime: 'minitool';
  isAlbumBridgeAvailable(): boolean;
  savePngToAlbum(dataUri: string): Promise<MiniToolImageSaveResult>;
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
  };
}

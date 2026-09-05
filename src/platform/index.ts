import { createBrowserPlatformServices } from './browserPlatform';
import type { PlatformServices } from './contracts';
import { createDesktopPlatformServices } from './desktopPlatform';

export function detectRuntime(host: object = globalThis): 'browser' | 'desktop' {
  return '__TAURI_INTERNALS__' in host ? 'desktop' : 'browser';
}

export function createPlatformServices(runtime = detectRuntime()): PlatformServices {
  return runtime === 'desktop' ? createDesktopPlatformServices() : createBrowserPlatformServices();
}

export const platformServices = createPlatformServices();

export type * from './contracts';

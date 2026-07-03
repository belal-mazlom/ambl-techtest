/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useSyncExternalStore } from 'react';

/** Tailwind `md` breakpoint is 768px; mobile is strictly below that. */
export const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';

function subscribeToMobileQuery(callback: () => void) {
    const mql = globalThis.matchMedia?.(MOBILE_VIEWPORT_QUERY);
    mql?.addEventListener('change', callback);
    return () => mql?.removeEventListener('change', callback);
}

function getMobileViewportSnapshot(): boolean {
    return globalThis.matchMedia?.(MOBILE_VIEWPORT_QUERY)?.matches ?? false;
}

function getMobileViewportServerSnapshot(): boolean {
    return false;
}

/**
 * Returns `true` when the viewport is below Tailwind's `md` breakpoint (768px).
 * Hydration-safe: server snapshot is always `false`.
 */
export function useIsMobileViewport(): boolean {
    return useSyncExternalStore(subscribeToMobileQuery, getMobileViewportSnapshot, getMobileViewportServerSnapshot);
}

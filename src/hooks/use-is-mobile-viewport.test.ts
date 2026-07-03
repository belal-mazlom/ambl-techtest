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
import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MOBILE_VIEWPORT_QUERY, useIsMobileViewport } from './use-is-mobile-viewport';

describe('useIsMobileViewport', () => {
    let originalMatchMedia: typeof globalThis.matchMedia;
    let changeHandler: (() => void) | undefined;

    beforeEach(() => {
        originalMatchMedia = globalThis.matchMedia;
        changeHandler = undefined;

        globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === MOBILE_VIEWPORT_QUERY,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((_event: string, handler: () => void) => {
                if (query === MOBILE_VIEWPORT_QUERY) {
                    changeHandler = handler;
                }
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as typeof globalThis.matchMedia;
    });

    afterEach(() => {
        globalThis.matchMedia = originalMatchMedia;
    });

    test('returns true when viewport matches mobile query', () => {
        const { result } = renderHook(() => useIsMobileViewport());
        expect(result.current).toBe(true);
    });

    test('returns false when viewport does not match mobile query', () => {
        globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as typeof globalThis.matchMedia;

        const { result } = renderHook(() => useIsMobileViewport());
        expect(result.current).toBe(false);
    });

    test('updates when matchMedia change event fires', () => {
        let matches = true;
        globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
            get matches() {
                return query === MOBILE_VIEWPORT_QUERY ? matches : false;
            },
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((_event: string, handler: () => void) => {
                if (query === MOBILE_VIEWPORT_QUERY) {
                    changeHandler = handler;
                }
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as typeof globalThis.matchMedia;

        const { result } = renderHook(() => useIsMobileViewport());
        expect(result.current).toBe(true);

        act(() => {
            matches = false;
            changeHandler?.();
        });

        expect(result.current).toBe(false);
    });
});

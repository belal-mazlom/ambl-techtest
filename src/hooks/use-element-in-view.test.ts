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
import { createRef } from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { useElementInView } from './use-element-in-view';

describe('useElementInView', () => {
    let originalIntersectionObserver: typeof globalThis.IntersectionObserver;
    let observerCallback: IntersectionObserverCallback | undefined;
    let observeMock: ReturnType<typeof vi.fn>;
    let disconnectMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        originalIntersectionObserver = globalThis.IntersectionObserver;
        observeMock = vi.fn();
        disconnectMock = vi.fn();
        observerCallback = undefined;

        class MockIntersectionObserver {
            root = null;
            rootMargin = '';
            thresholds: number[] = [];

            constructor(callback: IntersectionObserverCallback) {
                observerCallback = callback;
            }

            observe = observeMock;
            unobserve = vi.fn();
            disconnect = disconnectMock;
            takeRecords = () => [] as IntersectionObserverEntry[];
        }

        globalThis.IntersectionObserver =
            MockIntersectionObserver as unknown as typeof globalThis.IntersectionObserver;
    });

    afterEach(() => {
        globalThis.IntersectionObserver = originalIntersectionObserver;
    });

    test('returns true when disabled', () => {
        const targetRef = createRef<HTMLDivElement>();
        targetRef.current = document.createElement('div');

        const { result } = renderHook(() => useElementInView(targetRef, false));

        expect(result.current).toBe(true);
        expect(observeMock).not.toHaveBeenCalled();
    });

    test('observes target when enabled and updates isInView from callback', () => {
        const targetRef = createRef<HTMLDivElement>();
        targetRef.current = document.createElement('div');

        const { result } = renderHook(() => useElementInView(targetRef, true));

        expect(result.current).toBe(true);
        expect(observeMock).toHaveBeenCalledWith(targetRef.current);

        act(() => {
            observerCallback?.(
                [{ isIntersecting: false } as IntersectionObserverEntry],
                {} as IntersectionObserver
            );
        });

        expect(result.current).toBe(false);

        act(() => {
            observerCallback?.(
                [{ isIntersecting: true } as IntersectionObserverEntry],
                {} as IntersectionObserver
            );
        });

        expect(result.current).toBe(true);
    });

    test('disconnects observer on unmount', () => {
        const targetRef = createRef<HTMLDivElement>();
        targetRef.current = document.createElement('div');

        const { unmount } = renderHook(() => useElementInView(targetRef, true));

        unmount();

        expect(disconnectMock).toHaveBeenCalled();
    });

    test('retries observation until the target ref is available', async () => {
        const targetRef = createRef<HTMLDivElement>();

        renderHook(() => useElementInView(targetRef, true));

        expect(observeMock).not.toHaveBeenCalled();

        targetRef.current = document.createElement('div');

        await act(async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });

        expect(observeMock).toHaveBeenCalledWith(targetRef.current);
    });
});

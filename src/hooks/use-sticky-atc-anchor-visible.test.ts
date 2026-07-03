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
import { isElementInVisibleViewportBand, useStickyAtcAnchorVisible } from './use-sticky-atc-anchor-visible';

describe('isElementInVisibleViewportBand', () => {
    const headerBottom = 120;
    const viewportHeight = 800;

    test('returns false when the element is fully hidden behind the header', () => {
        expect(isElementInVisibleViewportBand({ top: 50, bottom: 98 }, headerBottom, viewportHeight)).toBe(false);
    });

    test('returns true when any part of the element is visible below the header', () => {
        expect(isElementInVisibleViewportBand({ top: 100, bottom: 148 }, headerBottom, viewportHeight)).toBe(true);
    });

    test('returns true when the element is fully visible below the header', () => {
        expect(isElementInVisibleViewportBand({ top: 200, bottom: 248 }, headerBottom, viewportHeight)).toBe(true);
    });

    test('returns false when the element is below the viewport', () => {
        expect(isElementInVisibleViewportBand({ top: 820, bottom: 868 }, headerBottom, viewportHeight)).toBe(false);
    });

    test('returns false when the element is above the viewport', () => {
        expect(isElementInVisibleViewportBand({ top: -40, bottom: -1 }, headerBottom, viewportHeight)).toBe(false);
    });
});

describe('useStickyAtcAnchorVisible', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: 800,
        });

        const header = document.createElement('header');
        document.body.appendChild(header);
        vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({
            bottom: 120,
        } as DOMRect);
    });

    afterEach(() => {
        document.querySelector('header')?.remove();
        vi.restoreAllMocks();
    });

    test('returns true when disabled', () => {
        const targetRef = createRef<HTMLDivElement>();
        targetRef.current = document.createElement('div');

        const { result } = renderHook(() => useStickyAtcAnchorVisible(targetRef, false));

        expect(result.current).toBe(true);
    });

    test('returns false when the anchor is fully hidden behind the header', async () => {
        const targetRef = createRef<HTMLDivElement>();
        const target = document.createElement('div');
        targetRef.current = target;
        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
            top: 50,
            bottom: 98,
        } as DOMRect);

        const { result } = renderHook(() => useStickyAtcAnchorVisible(targetRef, true));

        await act(async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });

        expect(result.current).toBe(false);
    });

    test('returns true when the anchor is visible below the header', async () => {
        const targetRef = createRef<HTMLDivElement>();
        const target = document.createElement('div');
        targetRef.current = target;
        vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
            top: 200,
            bottom: 248,
        } as DOMRect);

        const { result } = renderHook(() => useStickyAtcAnchorVisible(targetRef, true));

        await act(async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });

        expect(result.current).toBe(true);
    });

    test('updates on scroll', async () => {
        const targetRef = createRef<HTMLDivElement>();
        const target = document.createElement('div');
        targetRef.current = target;
        const rectSpy = vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
            top: 200,
            bottom: 248,
        } as DOMRect);

        const { result } = renderHook(() => useStickyAtcAnchorVisible(targetRef, true));

        await act(async () => {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });

        expect(result.current).toBe(true);

        rectSpy.mockReturnValue({
            top: 50,
            bottom: 98,
        } as DOMRect);

        await act(async () => {
            window.dispatchEvent(new Event('scroll'));
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });

        expect(result.current).toBe(false);
    });
});

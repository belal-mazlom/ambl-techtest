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

import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clampPinchTranslate, usePinchZoom } from './use-pinch-zoom';

const createTouch = (clientX: number, clientY: number, identifier: number): Touch =>
    ({
        identifier,
        clientX,
        clientY,
        pageX: clientX,
        pageY: clientY,
        screenX: clientX,
        screenY: clientY,
        target: document.body,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
    }) as Touch;

const touchEventInit = (touches: Touch[]) => ({
    touches,
    targetTouches: touches,
    changedTouches: touches,
});

const PinchZoomHarness = ({ maxScale = 3 }: { maxScale?: number }): ReactElement => {
    const { scale, translate, isZoomed, containerRef, reset, touchHandlers } = usePinchZoom({ maxScale });

    return createElement(
        'div',
        {
            ref: containerRef,
            'data-testid': 'pinch-container',
            'data-scale': scale,
            'data-translate-x': translate.x,
            'data-translate-y': translate.y,
            'data-zoomed': isZoomed,
            style: { width: '200px', height: '200px' },
            ...touchHandlers,
        },
        createElement('button', { type: 'button', onClick: reset }, 'Reset')
    );
};

describe('clampPinchTranslate', () => {
    it('returns zero translate at scale 1', () => {
        expect(clampPinchTranslate({ x: 50, y: 50 }, 1, 200, 200)).toEqual({ x: 0, y: 0 });
    });

    it('clamps translate within container bounds at scale > 1', () => {
        expect(clampPinchTranslate({ x: 200, y: -200 }, 2, 200, 200)).toEqual({ x: 100, y: -100 });
    });
});

describe('usePinchZoom', () => {
    beforeEach(() => {
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 200,
            bottom: 200,
            width: 200,
            height: 200,
            toJSON: () => ({}),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initializes with scale 1 and no translation', () => {
        const { result } = renderHook(() => usePinchZoom());

        expect(result.current.scale).toBe(1);
        expect(result.current.translate).toEqual({ x: 0, y: 0 });
        expect(result.current.isZoomed).toBe(false);
    });

    it('increases scale when a pinch gesture is performed', () => {
        const { getByTestId } = render(createElement(PinchZoomHarness));
        const container = getByTestId('pinch-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(40, 100, 0), createTouch(160, 100, 1)]));
        });

        act(() => {
            fireEvent.touchMove(container, touchEventInit([createTouch(10, 100, 0), createTouch(190, 100, 1)]));
        });

        expect(Number(container.getAttribute('data-scale'))).toBeGreaterThan(1);
        expect(container.getAttribute('data-zoomed')).toBe('true');
    });

    it('clamps scale at maxScale', () => {
        const { getByTestId } = render(createElement(PinchZoomHarness, { maxScale: 2 }));
        const container = getByTestId('pinch-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(90, 100, 0), createTouch(110, 100, 1)]));
        });

        act(() => {
            fireEvent.touchMove(container, touchEventInit([createTouch(0, 100, 0), createTouch(200, 100, 1)]));
        });

        expect(Number(container.getAttribute('data-scale'))).toBe(2);
    });

    it('reset restores default zoom state', () => {
        const { getByTestId, getByRole } = render(createElement(PinchZoomHarness));
        const container = getByTestId('pinch-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(40, 100, 0), createTouch(160, 100, 1)]));
            fireEvent.touchMove(container, touchEventInit([createTouch(10, 100, 0), createTouch(190, 100, 1)]));
        });

        act(() => {
            fireEvent.click(getByRole('button', { name: 'Reset' }));
        });

        expect(container.getAttribute('data-scale')).toBe('1');
        expect(container.getAttribute('data-translate-x')).toBe('0');
        expect(container.getAttribute('data-translate-y')).toBe('0');
        expect(container.getAttribute('data-zoomed')).toBe('false');
    });

    it('resets when pointerdown occurs outside the container', () => {
        const { getByTestId } = render(
            createElement('div', null, [
                createElement(PinchZoomHarness, { key: 'zoom' }),
                createElement('button', { key: 'outside', type: 'button' }, 'Outside'),
            ])
        );
        const container = getByTestId('pinch-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(40, 100, 0), createTouch(160, 100, 1)]));
            fireEvent.touchMove(container, touchEventInit([createTouch(10, 100, 0), createTouch(190, 100, 1)]));
        });

        act(() => {
            fireEvent.pointerDown(document.body, { bubbles: true });
        });

        expect(container.getAttribute('data-scale')).toBe('1');
        expect(container.getAttribute('data-zoomed')).toBe('false');
    });

    it('registers non-passive touch listeners to block browser pinch-zoom', () => {
        const addEventListenerSpy = vi.spyOn(HTMLDivElement.prototype, 'addEventListener');

        render(createElement(PinchZoomHarness));

        const touchStartCalls = addEventListenerSpy.mock.calls.filter(([type]) => type === 'touchstart');
        const touchMoveCalls = addEventListenerSpy.mock.calls.filter(([type]) => type === 'touchmove');

        const hasNonPassiveOption = (options: boolean | AddEventListenerOptions | undefined): boolean =>
            typeof options === 'object' && options?.passive === false;

        expect(touchStartCalls.some(([, , options]) => hasNonPassiveOption(options))).toBe(true);
        expect(touchMoveCalls.some(([, , options]) => hasNonPassiveOption(options))).toBe(true);

        addEventListenerSpy.mockRestore();
    });
});

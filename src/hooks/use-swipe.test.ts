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
import { describe, expect, it, vi } from 'vitest';
import { useSwipe } from './use-swipe';

const createTouch = (clientX: number, clientY: number, identifier = 0): Touch =>
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

interface SwipeHarnessProps {
    enabled?: boolean;
    threshold?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
}

const SwipeHarness = ({ enabled, threshold, onSwipeLeft, onSwipeRight }: SwipeHarnessProps): ReactElement => {
    const { swipeHandlers } = useSwipe({ enabled, threshold, onSwipeLeft, onSwipeRight });

    return createElement('div', {
        'data-testid': 'swipe-container',
        style: { width: '200px', height: '200px' },
        ...swipeHandlers,
    });
};

describe('useSwipe', () => {
    it('calls onSwipeLeft when swiping left beyond threshold', () => {
        const onSwipeLeft = vi.fn();
        const { getByTestId } = render(createElement(SwipeHarness, { onSwipeLeft, onSwipeRight: vi.fn() }));
        const container = getByTestId('swipe-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(100, 100)]));
            fireEvent.touchMove(container, touchEventInit([createTouch(50, 100)]));
            fireEvent.touchEnd(container, touchEventInit([createTouch(40, 100)]));
        });

        expect(onSwipeLeft).toHaveBeenCalledOnce();
    });

    it('calls onSwipeRight when swiping right beyond threshold', () => {
        const onSwipeRight = vi.fn();
        const { getByTestId } = render(createElement(SwipeHarness, { onSwipeLeft: vi.fn(), onSwipeRight }));
        const container = getByTestId('swipe-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(40, 100)]));
            fireEvent.touchMove(container, touchEventInit([createTouch(90, 100)]));
            fireEvent.touchEnd(container, touchEventInit([createTouch(100, 100)]));
        });

        expect(onSwipeRight).toHaveBeenCalledOnce();
    });

    it('ignores swipes below threshold', () => {
        const onSwipeLeft = vi.fn();
        const onSwipeRight = vi.fn();
        const { getByTestId } = render(createElement(SwipeHarness, { threshold: 40, onSwipeLeft, onSwipeRight }));
        const container = getByTestId('swipe-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(100, 100)]));
            fireEvent.touchEnd(container, touchEventInit([createTouch(80, 100)]));
        });

        expect(onSwipeLeft).not.toHaveBeenCalled();
        expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('does not register swipes when disabled', () => {
        const onSwipeLeft = vi.fn();
        const { getByTestId } = render(
            createElement(SwipeHarness, { enabled: false, onSwipeLeft, onSwipeRight: vi.fn() })
        );
        const container = getByTestId('swipe-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(100, 100)]));
            fireEvent.touchEnd(container, touchEventInit([createTouch(20, 100)]));
        });

        expect(onSwipeLeft).not.toHaveBeenCalled();
    });

    it('does not call swipe callbacks for vertical gestures', () => {
        const onSwipeLeft = vi.fn();
        const onSwipeRight = vi.fn();
        const { getByTestId } = render(createElement(SwipeHarness, { onSwipeLeft, onSwipeRight }));
        const container = getByTestId('swipe-container');

        act(() => {
            fireEvent.touchStart(container, touchEventInit([createTouch(100, 100)]));
            fireEvent.touchMove(container, touchEventInit([createTouch(100, 160)]));
            fireEvent.touchEnd(container, touchEventInit([createTouch(100, 180)]));
        });

        expect(onSwipeLeft).not.toHaveBeenCalled();
        expect(onSwipeRight).not.toHaveBeenCalled();
    });

    it('calls preventDefault on touchmove when horizontal intent is detected', () => {
        const { result } = renderHook(() => useSwipe({ onSwipeLeft: vi.fn(), onSwipeRight: vi.fn() }));
        const preventDefault = vi.fn();

        act(() => {
            result.current.swipeHandlers.onTouchStart({
                touches: [createTouch(100, 100)],
            } as unknown as React.TouchEvent);
        });

        act(() => {
            result.current.swipeHandlers.onTouchMove({
                touches: [createTouch(50, 100)],
                preventDefault,
            } as unknown as React.TouchEvent);
        });

        expect(preventDefault).toHaveBeenCalled();
    });
});

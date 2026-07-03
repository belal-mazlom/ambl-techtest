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
import { useCallback, useRef, type TouchEvent as ReactTouchEvent } from 'react';

export interface UseSwipeOptions {
    enabled?: boolean;
    /** Minimum horizontal distance (px) to register a swipe. @default 40 */
    threshold?: number;
    /** Horizontal dead-zone (px) before scroll is suppressed. @default 10 */
    deadZone?: number;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
}

export interface UseSwipeReturn {
    swipeHandlers: {
        onTouchStart: (event: ReactTouchEvent) => void;
        onTouchMove: (event: ReactTouchEvent) => void;
        onTouchEnd: (event: ReactTouchEvent) => void;
    };
}

const DEFAULT_THRESHOLD = 40;
const DEFAULT_DEAD_ZONE = 10;

export function useSwipe({
    enabled = true,
    threshold = DEFAULT_THRESHOLD,
    deadZone = DEFAULT_DEAD_ZONE,
    onSwipeLeft,
    onSwipeRight,
}: UseSwipeOptions = {}): UseSwipeReturn {
    const startXRef = useRef<number | null>(null);
    const startYRef = useRef<number | null>(null);
    const isHorizontalRef = useRef(false);
    const didSwipeRef = useRef(false);

    const reset = useCallback(() => {
        startXRef.current = null;
        startYRef.current = null;
        isHorizontalRef.current = false;
        didSwipeRef.current = false;
    }, []);

    const onTouchStart = useCallback(
        (event: ReactTouchEvent) => {
            if (!enabled) {
                return;
            }
            const touch = event.touches[0];
            if (!touch) {
                return;
            }
            startXRef.current = touch.clientX;
            startYRef.current = touch.clientY;
            isHorizontalRef.current = false;
            didSwipeRef.current = false;
        },
        [enabled]
    );

    const onTouchMove = useCallback(
        (event: ReactTouchEvent) => {
            if (!enabled || startXRef.current === null || startYRef.current === null) {
                return;
            }
            const touch = event.touches[0];
            if (!touch) {
                return;
            }

            const deltaX = touch.clientX - startXRef.current;
            const deltaY = touch.clientY - startYRef.current;

            if (!isHorizontalRef.current) {
                if (Math.abs(deltaX) > deadZone && Math.abs(deltaX) > Math.abs(deltaY)) {
                    isHorizontalRef.current = true;
                } else if (Math.abs(deltaY) > deadZone && Math.abs(deltaY) > Math.abs(deltaX)) {
                    reset();
                    return;
                }
            }

            if (isHorizontalRef.current) {
                event.preventDefault();
            }
        },
        [enabled, deadZone, reset]
    );

    const onTouchEnd = useCallback(
        (event: ReactTouchEvent) => {
            if (!enabled || startXRef.current === null || didSwipeRef.current) {
                reset();
                return;
            }

            const touch = event.changedTouches[0];
            if (!touch) {
                reset();
                return;
            }

            const deltaX = touch.clientX - startXRef.current;

            if (Math.abs(deltaX) >= threshold) {
                didSwipeRef.current = true;
                if (deltaX < 0) {
                    onSwipeLeft?.();
                } else {
                    onSwipeRight?.();
                }
            }

            reset();
        },
        [enabled, threshold, onSwipeLeft, onSwipeRight, reset]
    );

    return {
        swipeHandlers: {
            onTouchStart,
            onTouchMove,
            onTouchEnd,
        },
    };
}

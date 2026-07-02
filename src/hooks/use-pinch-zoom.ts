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
import { useCallback, useEffect, useRef, useState, type RefObject, type TouchEvent as ReactTouchEvent } from 'react';

export interface PinchZoomTranslate {
    x: number;
    y: number;
}

export interface UsePinchZoomOptions {
    minScale?: number;
    maxScale?: number;
    enabled?: boolean;
}

export interface UsePinchZoomReturn {
    scale: number;
    translate: PinchZoomTranslate;
    isZoomed: boolean;
    containerRef: RefObject<HTMLDivElement | null>;
    reset: () => void;
    touchHandlers: {
        onTouchStart: (event: ReactTouchEvent<HTMLDivElement>) => void;
        onTouchMove: (event: ReactTouchEvent<HTMLDivElement>) => void;
        onTouchEnd: (event: ReactTouchEvent<HTMLDivElement>) => void;
    };
}

const DEFAULT_MIN_SCALE = 1;
const DEFAULT_MAX_SCALE = 3;

interface TouchPoint {
    clientX: number;
    clientY: number;
}

interface TouchPointList {
    readonly length: number;
    readonly [index: number]: TouchPoint;
}

const getTouchDistance = (touches: TouchPointList): number => {
    const first = touches[0];
    const second = touches[1];
    if (!first || !second) {
        return 0;
    }
    const dx = first.clientX - second.clientX;
    const dy = first.clientY - second.clientY;
    return Math.hypot(dx, dy);
};

const getTouchCentroid = (touches: TouchPointList): PinchZoomTranslate => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
});

export const clampPinchTranslate = (
    translate: PinchZoomTranslate,
    scale: number,
    width: number,
    height: number
): PinchZoomTranslate => {
    if (scale <= 1 || width <= 0 || height <= 0) {
        return { x: 0, y: 0 };
    }

    const maxX = ((scale - 1) * width) / 2;
    const maxY = ((scale - 1) * height) / 2;

    return {
        x: Math.min(maxX, Math.max(-maxX, translate.x)),
        y: Math.min(maxY, Math.max(-maxY, translate.y)),
    };
};

/**
 * Touch pinch-to-zoom hook with pan support and outside-tap deactivation.
 */
export function usePinchZoom({
    minScale = DEFAULT_MIN_SCALE,
    maxScale = DEFAULT_MAX_SCALE,
    enabled = true,
}: UsePinchZoomOptions = {}): UsePinchZoomReturn {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [scale, setScale] = useState(minScale);
    const [translate, setTranslate] = useState<PinchZoomTranslate>({ x: 0, y: 0 });

    const pinchStateRef = useRef<{
        initialDistance: number;
        initialScale: number;
        initialCentroid: PinchZoomTranslate;
        initialTranslate: PinchZoomTranslate;
    } | null>(null);

    const panStateRef = useRef<{
        startCentroid: PinchZoomTranslate;
        startTranslate: PinchZoomTranslate;
    } | null>(null);

    const isGestureActiveRef = useRef(false);

    const reset = useCallback(() => {
        setScale(minScale);
        setTranslate({ x: 0, y: 0 });
        pinchStateRef.current = null;
        panStateRef.current = null;
        isGestureActiveRef.current = false;
    }, [minScale]);

    const clampToContainer = useCallback((nextTranslate: PinchZoomTranslate, nextScale: number): PinchZoomTranslate => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) {
            return nextTranslate;
        }
        return clampPinchTranslate(nextTranslate, nextScale, rect.width, rect.height);
    }, []);

    const handleTouchStart = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (!enabled) {
                return;
            }

            if (event.touches.length === 2) {
                isGestureActiveRef.current = true;
                panStateRef.current = null;
                pinchStateRef.current = {
                    initialDistance: getTouchDistance(event.touches as TouchPointList),
                    initialScale: scale,
                    initialCentroid: getTouchCentroid(event.touches as TouchPointList),
                    initialTranslate: translate,
                };
                return;
            }

            if (event.touches.length === 1 && scale > minScale) {
                isGestureActiveRef.current = true;
                pinchStateRef.current = null;
                panStateRef.current = {
                    startCentroid: {
                        x: event.touches[0].clientX,
                        y: event.touches[0].clientY,
                    },
                    startTranslate: translate,
                };
            }
        },
        [enabled, minScale, scale, translate]
    );

    const handleTouchMove = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (!enabled) {
                return;
            }

            if (event.touches.length === 2 && pinchStateRef.current) {
                event.preventDefault();
                const distance = getTouchDistance(event.touches as TouchPointList);
                const { initialDistance, initialScale, initialCentroid, initialTranslate } = pinchStateRef.current;

                if (initialDistance <= 0) {
                    return;
                }

                const nextScale = Math.min(maxScale, Math.max(minScale, initialScale * (distance / initialDistance)));
                const centroid = getTouchCentroid(event.touches as TouchPointList);
                const nextTranslate = clampToContainer(
                    {
                        x: initialTranslate.x + (centroid.x - initialCentroid.x),
                        y: initialTranslate.y + (centroid.y - initialCentroid.y),
                    },
                    nextScale
                );

                setScale(nextScale);
                setTranslate(nextTranslate);
                return;
            }

            if (event.touches.length === 1 && panStateRef.current && scale > minScale) {
                event.preventDefault();
                const { startCentroid, startTranslate } = panStateRef.current;
                const nextTranslate = clampToContainer(
                    {
                        x: startTranslate.x + (event.touches[0].clientX - startCentroid.x),
                        y: startTranslate.y + (event.touches[0].clientY - startCentroid.y),
                    },
                    scale
                );
                setTranslate(nextTranslate);
            }
        },
        [clampToContainer, enabled, maxScale, minScale, scale]
    );

    const handleTouchEnd = useCallback(
        (event: ReactTouchEvent<HTMLDivElement>) => {
            if (!enabled) {
                return;
            }

            if (event.touches.length < 2) {
                pinchStateRef.current = null;
            }

            if (event.touches.length === 0) {
                panStateRef.current = null;
                isGestureActiveRef.current = false;
                if (scale <= minScale) {
                    reset();
                }
            }
        },
        [enabled, minScale, reset, scale]
    );

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleOutsidePointerDown = (event: PointerEvent) => {
            const container = containerRef.current;
            if (!container || container.contains(event.target as Node)) {
                return;
            }

            reset();
        };

        document.addEventListener('pointerdown', handleOutsidePointerDown, true);
        return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    }, [enabled, reset]);

    // React registers touch listeners as passive, so preventDefault() in synthetic handlers
    // does not block the browser's page-level pinch-zoom. Native non-passive listeners
    // keep multi-touch gestures contained to this element.
    useEffect(() => {
        const element = containerRef.current;
        if (!element || !enabled) {
            return;
        }

        const blockBrowserZoom = (event: TouchEvent) => {
            if (event.touches.length > 1 || isGestureActiveRef.current) {
                event.preventDefault();
            }
        };

        element.addEventListener('touchstart', blockBrowserZoom, { passive: false });
        element.addEventListener('touchmove', blockBrowserZoom, { passive: false });

        return () => {
            element.removeEventListener('touchstart', blockBrowserZoom);
            element.removeEventListener('touchmove', blockBrowserZoom);
        };
    }, [enabled]);

    return {
        scale,
        translate,
        isZoomed: scale > minScale,
        containerRef,
        reset,
        touchHandlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
        },
    };
}

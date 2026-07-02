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
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
    type KeyboardEvent,
    type MouseEvent,
    type ReactElement,
} from 'react';
import { DynamicImage } from '@/components/dynamic-image';
import { usePinchZoom } from '@/hooks/use-pinch-zoom';
import type { DynamicImageDimensions } from '@/lib/images/dynamic-image';
import { cn } from '@/lib/utils';
import type { ProductImage } from './types';

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const HOVER_ZOOM_SCALE = 2;
const KEYBOARD_ZOOM_SCALE = 1.5;

interface ProductImageZoomProps {
    images: ProductImage[];
    selectedImageIndex: number;
    altFallback: string;
    widths: DynamicImageDimensions;
    eager?: boolean;
}

const subscribeToFinePointer = (callback: () => void) => {
    const mediaQuery = globalThis.matchMedia?.(FINE_POINTER_QUERY);
    mediaQuery?.addEventListener('change', callback);
    return () => mediaQuery?.removeEventListener('change', callback);
};

const getFinePointerSnapshot = (): boolean => globalThis.matchMedia?.(FINE_POINTER_QUERY)?.matches ?? false;

const getFinePointerServerSnapshot = (): boolean => false;

const useFinePointer = (): boolean =>
    useSyncExternalStore(subscribeToFinePointer, getFinePointerSnapshot, getFinePointerServerSnapshot);

const getHoverTransform = (event: MouseEvent<HTMLDivElement>, scale: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

    return {
        scale,
        originX: px * 100,
        originY: py * 100,
    };
};

export default function ProductImageZoom({
    images,
    selectedImageIndex,
    altFallback,
    widths,
    eager = false,
}: ProductImageZoomProps): ReactElement {
    const hasFinePointer = useFinePointer();
    const [hoverActive, setHoverActive] = useState(false);
    const [hoverTransform, setHoverTransform] = useState({ scale: 1, originX: 50, originY: 50 });
    const [keyboardZoomActive, setKeyboardZoomActive] = useState(false);

    const {
        scale: pinchScale,
        translate: pinchTranslate,
        isZoomed: isPinchZoomed,
        reset: resetPinchZoom,
        containerRef,
        touchHandlers,
    } = usePinchZoom({ enabled: !hasFinePointer });

    const selectedImage = images[selectedImageIndex] ?? images[0];

    const resetAllZoom = useCallback(() => {
        setHoverActive(false);
        setHoverTransform({ scale: 1, originX: 50, originY: 50 });
        setKeyboardZoomActive(false);
        resetPinchZoom();
    }, [resetPinchZoom]);

    useEffect(() => {
        resetAllZoom();
    }, [selectedImageIndex, resetAllZoom]);

    const handleMouseEnter = useCallback(
        (event: MouseEvent<HTMLDivElement>) => {
            if (!hasFinePointer || keyboardZoomActive || isPinchZoomed) {
                return;
            }
            setHoverActive(true);
            setHoverTransform(getHoverTransform(event, HOVER_ZOOM_SCALE));
        },
        [hasFinePointer, isPinchZoomed, keyboardZoomActive]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent<HTMLDivElement>) => {
            if (!hasFinePointer || !hoverActive || keyboardZoomActive || isPinchZoomed) {
                return;
            }
            setHoverTransform(getHoverTransform(event, HOVER_ZOOM_SCALE));
        },
        [hasFinePointer, hoverActive, isPinchZoomed, keyboardZoomActive]
    );

    const handleMouseLeave = useCallback(() => {
        if (!hasFinePointer) {
            return;
        }
        setHoverActive(false);
        setHoverTransform({ scale: 1, originX: 50, originY: 50 });
    }, [hasFinePointer]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                resetAllZoom();
                return;
            }

            if (event.key !== 'Enter' && event.key !== ' ') {
                return;
            }

            event.preventDefault();
            if (keyboardZoomActive) {
                setKeyboardZoomActive(false);
                return;
            }

            setHoverActive(false);
            setHoverTransform({ scale: 1, originX: 50, originY: 50 });
            resetPinchZoom();
            setKeyboardZoomActive(true);
        },
        [keyboardZoomActive, resetAllZoom, resetPinchZoom]
    );

    const transformStyle = useMemo(() => {
        if (keyboardZoomActive) {
            return {
                transform: `translate(0%, 0%) scale(${KEYBOARD_ZOOM_SCALE})`,
            };
        }

        if (isPinchZoomed) {
            return {
                transform: `translate(${pinchTranslate.x}px, ${pinchTranslate.y}px) scale(${pinchScale})`,
            };
        }

        if (hoverActive) {
            return {
                transformOrigin: `${hoverTransform.originX}% ${hoverTransform.originY}%`,
                transform: `scale(${hoverTransform.scale})`,
            };
        }

        return {
            transformOrigin: 'center center',
            transform: 'scale(1)',
        };
    }, [
        hoverActive,
        hoverTransform.originX,
        hoverTransform.originY,
        hoverTransform.scale,
        isPinchZoomed,
        keyboardZoomActive,
        pinchScale,
        pinchTranslate.x,
        pinchTranslate.y,
    ]);

    return (
        <div
            ref={containerRef}
            className={cn('h-full w-full outline-none', !hasFinePointer && 'touch-none')}
            tabIndex={0}
            role="button"
            aria-pressed={keyboardZoomActive}
            aria-label="Product image. Press Enter or Space to zoom. Press Escape to exit zoom."
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
            {...touchHandlers}>
            <div className="h-full w-full will-change-transform" style={transformStyle}>
                <DynamicImage
                    src={selectedImage.src}
                    alt={selectedImage.alt || altFallback}
                    widths={widths}
                    className="w-full h-full object-cover object-center [&_img]:object-contain! [&_img]:h-full! [&_img]:max-w-full! [&_img]:mx-auto!"
                    loading={eager ? 'eager' : 'lazy'}
                    priority={eager ? 'high' : undefined}
                />
            </div>
        </div>
    );
}

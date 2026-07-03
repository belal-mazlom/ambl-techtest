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
import { type RefObject, useEffect, useState } from 'react';
import { isServer } from '@/lib/utils';

type ElementRect = Pick<DOMRectReadOnly, 'top' | 'bottom'>;

/**
 * Returns whether an element overlaps the viewport band below the sticky header.
 * The native Add to Cart is user-visible only when some part sits below the header.
 */
export function isElementInVisibleViewportBand(
    rect: ElementRect,
    bandTopPx: number,
    bandBottomPx: number
): boolean {
    return rect.bottom > bandTopPx && rect.top < bandBottomPx;
}

function getStickyHeaderBottomPx(): number {
    return document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
}

/**
 * Tracks whether the native Add to Cart anchor is visible to the user in the viewport
 * below the sticky site header. Uses scroll/resize measurement for reliable updates.
 */
export function useStickyAtcAnchorVisible(targetRef: RefObject<Element | null>, enabled: boolean): boolean {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!enabled || isServer()) {
            setIsVisible(true);
            return;
        }

        let rafId = 0;
        let cancelled = false;

        const measure = () => {
            if (cancelled) {
                return;
            }

            const target = targetRef.current;
            if (!target) {
                rafId = requestAnimationFrame(measure);
                return;
            }

            const rect = target.getBoundingClientRect();
            const headerBottom = getStickyHeaderBottomPx();
            const viewportHeight = window.innerHeight;

            setIsVisible(isElementInVisibleViewportBand(rect, headerBottom, viewportHeight));
        };

        const scheduleMeasure = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(measure);
        };

        scheduleMeasure();

        window.addEventListener('scroll', scheduleMeasure, { passive: true });
        window.addEventListener('resize', scheduleMeasure);
        window.visualViewport?.addEventListener('scroll', scheduleMeasure);
        window.visualViewport?.addEventListener('resize', scheduleMeasure);

        const header = document.querySelector('header');
        const headerObserver = header ? new ResizeObserver(scheduleMeasure) : null;
        if (header) {
            headerObserver?.observe(header);
        }

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            window.removeEventListener('scroll', scheduleMeasure);
            window.removeEventListener('resize', scheduleMeasure);
            window.visualViewport?.removeEventListener('scroll', scheduleMeasure);
            window.visualViewport?.removeEventListener('resize', scheduleMeasure);
            headerObserver?.disconnect();
        };
    }, [enabled, targetRef]);

    return isVisible;
}

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

interface UseElementInViewOptions {
    threshold?: number;
    rootMargin?: string;
}

/**
 * Tracks whether a target element intersects the viewport via IntersectionObserver.
 *
 * When `enabled` is false or on the server, returns `true` (treat as in-view) so consumers
 * that hide UI when the element is out of view stay hidden until observation starts.
 */
export function useElementInView(
    targetRef: RefObject<Element | null>,
    enabled: boolean,
    { threshold = 0, rootMargin = '0px' }: UseElementInViewOptions = {}
): boolean {
    const [isInView, setIsInView] = useState(true);

    useEffect(() => {
        if (!enabled || isServer()) {
            setIsInView(true);
            return;
        }

        let observer: IntersectionObserver | null = null;
        let rafId = 0;
        let cancelled = false;

        const attachObserver = () => {
            if (cancelled) {
                return;
            }

            const target = targetRef.current;
            if (!target) {
                rafId = requestAnimationFrame(attachObserver);
                return;
            }

            observer = new IntersectionObserver(
                ([entry]) => {
                    setIsInView(entry?.isIntersecting ?? true);
                },
                { threshold, rootMargin }
            );

            observer.observe(target);
        };

        attachObserver();

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            observer?.disconnect();
        };
    }, [enabled, targetRef, threshold, rootMargin]);

    return isInView;
}

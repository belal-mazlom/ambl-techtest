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
import { type ReactElement, type RefObject, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useStickyAtcAnchorVisible } from '@/hooks/use-sticky-atc-anchor-visible';
import { useIsMobileViewport } from '@/hooks/use-is-mobile-viewport';
import { cn } from '@/lib/utils';

export interface StickyAddToCartBarProps {
    /** Ref attached to the native inline Add to Cart button for visibility tracking. */
    atcAnchorRef: RefObject<HTMLElement | null>;
    productName: string;
    /** Variant summary or selection progress text shown below the product name. */
    summary: string;
    canAddToCart: boolean;
    isAdding: boolean;
    onAddToCart: () => void;
    addToCartLabel: string;
    selectOptionsLabel: string;
    addingLabel: string;
}

/**
 * Mobile-only sticky Add to Cart bar that slides in when the native inline button scrolls out of view.
 * Renders nothing during SSR and on the first client paint to avoid hydration mismatches.
 */
export default function StickyAddToCartBar({
    atcAnchorRef,
    productName,
    summary,
    canAddToCart,
    isAdding,
    onAddToCart,
    addToCartLabel,
    selectOptionsLabel,
    addingLabel,
}: StickyAddToCartBarProps): ReactElement | null {
    const [isMounted, setIsMounted] = useState(false);
    const isMobile = useIsMobileViewport();
    const isNativeAtcVisible = useStickyAtcAnchorVisible(atcAnchorRef, isMounted && isMobile);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    const isVisible = isMobile && !isNativeAtcVisible;
    const buttonLabel = isAdding ? addingLabel : canAddToCart ? addToCartLabel : selectOptionsLabel;

    const bar = (
        <div
            className="fixed bottom-0 left-0 right-0 z-40 w-full md:hidden"
            aria-hidden={!isVisible}
            data-testid="sticky-add-to-cart-bar">
            <div
                className={cn(
                    'border-t border-border bg-background shadow-none',
                    'transition-[transform,opacity,visibility] duration-300 ease-in-out',
                    isVisible
                        ? 'translate-y-0 opacity-100 visible'
                        : 'pointer-events-none translate-y-full opacity-0 invisible'
                )}
                data-testid="sticky-add-to-cart-bar-panel">
                <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{productName}</p>
                        {summary ? <p className="truncate text-sm text-muted-foreground">{summary}</p> : null}
                    </div>
                    <Button
                        data-testid="sticky-add-to-cart"
                        size="sm"
                        className="shrink-0"
                        onClick={onAddToCart}
                        disabled={!canAddToCart || isAdding}
                        tabIndex={isVisible ? undefined : -1}>
                        {buttonLabel}
                    </Button>
                </div>
            </div>
        </div>
    );

    return createPortal(bar, document.body);
}

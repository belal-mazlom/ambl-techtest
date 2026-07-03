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
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { Link } from '@/components/link';
import type { ShopperSearch } from '@/scapi';
import { createProductUrl, getImagesForColor } from '@/lib/product/product-utils';
import { useDynamicImageContext } from '@/providers/dynamic-image';
import { useSwipe } from '@/hooks/use-swipe';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { cn } from '@/lib/utils';
import { ProductImage } from './product-image';
import { useTranslation } from 'react-i18next';

interface ProductImageContainerProps {
    product: ShopperSearch.schemas['ProductSearchHit'];
    selectedColorValue?: string | null;
    className?: string;
    handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
    /** Image aspect ratio (width/height). If provided, calculates height based on viewport width. Defaults to 1 (square) */
    imgAspectRatio?: number;
}

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

const subscribeToFinePointer = (callback: () => void) => {
    const mediaQuery = globalThis.matchMedia?.(FINE_POINTER_QUERY);
    mediaQuery?.addEventListener('change', callback);
    return () => mediaQuery?.removeEventListener('change', callback);
};

const getFinePointerSnapshot = (): boolean => globalThis.matchMedia?.(FINE_POINTER_QUERY)?.matches ?? false;

const getFinePointerServerSnapshot = (): boolean => false;

const useFinePointer = (): boolean =>
    useSyncExternalStore(subscribeToFinePointer, getFinePointerSnapshot, getFinePointerServerSnapshot);

function ImageCyclerDots({ count, activeIndex }: { count: number; activeIndex: number }) {
    return (
        <div
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 pointer-events-none"
            aria-hidden="true">
            {Array.from({ length: count }, (_, index) => (
                <span
                    key={index}
                    className={cn(
                        'size-1.5 rounded-full transition-colors',
                        index === activeIndex ? 'bg-foreground' : 'border border-foreground/60 bg-transparent'
                    )}
                />
            ))}
        </div>
    );
}

const ProductImageContainer = ({
    product,
    selectedColorValue = null,
    className,
    handleProductClick,
    imgAspectRatio = 1,
}: ProductImageContainerProps) => {
    const { t } = useTranslation('product');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [mountedIndices, setMountedIndices] = useState<Set<number>>(() => new Set([0]));
    const isHydrated = useIsHydrated();
    const hasFinePointer = useFinePointer();

    const allImages = useMemo(
        () => getImagesForColor(product, selectedColorValue, 'medium'),
        [product, selectedColorValue]
    );

    const hasMultipleImages = allImages.length > 1;
    const isCyclerActive = hasMultipleImages && isHydrated;

    useEffect(() => {
        setSelectedImageIndex(0);
        setMountedIndices(new Set([0]));
    }, [selectedColorValue, product.productId]);

    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (!hasMultipleImages) {
                return;
            }
            const wrapped = ((nextIndex % allImages.length) + allImages.length) % allImages.length;
            setSelectedImageIndex(wrapped);
            setMountedIndices((prev) => {
                if (prev.has(wrapped)) {
                    return prev;
                }
                const next = new Set(prev);
                next.add(wrapped);
                return next;
            });
        },
        [allImages.length, hasMultipleImages]
    );

    const goPrev = useCallback(() => {
        goToIndex(selectedImageIndex - 1);
    }, [goToIndex, selectedImageIndex]);

    const goNext = useCallback(() => {
        goToIndex(selectedImageIndex + 1);
    }, [goToIndex, selectedImageIndex]);

    const { swipeHandlers } = useSwipe({
        enabled: isCyclerActive && !hasFinePointer,
        onSwipeLeft: goNext,
        onSwipeRight: goPrev,
    });

    const handlePointerHover = useCallback(
        (event: MouseEvent<HTMLDivElement>) => {
            if (!isCyclerActive || !hasFinePointer) {
                return;
            }
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) {
                return;
            }
            const ratio = (event.clientX - rect.left) / rect.width;
            const hoverIndex = Math.min(allImages.length - 1, Math.max(0, Math.floor(ratio * allImages.length)));
            goToIndex(hoverIndex);
        },
        [allImages.length, goToIndex, hasFinePointer, isCyclerActive]
    );

    const handleMouseLeave = useCallback(() => {
        goToIndex(0);
    }, [goToIndex]);

    const primaryImage = allImages[0] ?? product.image;
    const primaryImageUrl = primaryImage?.disBaseLink || primaryImage?.link;
    const imageAltFallback = product.productName || t('imageAlt') || 'Product Image';

    const imageContext = useDynamicImageContext();
    primaryImageUrl && imageContext?.addSource(primaryImageUrl);

    const handleClick = useCallback(() => {
        handleProductClick?.(product);
    }, [handleProductClick, product]);

    const heightStyle = imgAspectRatio !== 1 ? { aspectRatio: `${imgAspectRatio}` } : {};

    const renderImage = (index: number, isActive: boolean) => {
        const image = allImages[index];
        const imageUrl = image?.disBaseLink || image?.link || '';
        const isPrimary = index === 0;

        return (
            <ProductImage
                key={imageUrl || index}
                src={imageUrl}
                alt={image?.alt || imageAltFallback}
                className={cn(
                    'w-full h-full object-cover transition-all duration-200 group-hover:scale-105',
                    isCyclerActive && 'absolute inset-0 transition-opacity duration-300 group-hover:scale-100',
                    isCyclerActive && (isActive ? 'opacity-100' : 'opacity-0')
                )}
                widths={imageContext?.widths}
                loading={isPrimary ? undefined : 'lazy'}
                priority={isPrimary ? undefined : 'low'}
            />
        );
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden bg-secondary/20 flex flex-col',
                imgAspectRatio === 1 && 'aspect-square',
                className
            )}
            style={heightStyle}
            onMouseEnter={isCyclerActive && hasFinePointer ? handlePointerHover : undefined}
            onMouseMove={isCyclerActive && hasFinePointer ? handlePointerHover : undefined}
            onMouseLeave={isCyclerActive && hasFinePointer ? handleMouseLeave : undefined}
            {...(isCyclerActive && !hasFinePointer ? swipeHandlers : {})}>
            <Link
                to={createProductUrl(product.productId, selectedColorValue)}
                onClick={handleClick}
                className="relative block w-full h-full flex-1"
                aria-label={t('viewProductAriaLabel', { productName: imageAltFallback }) || imageAltFallback}>
                {isCyclerActive ? (
                    <div className="relative w-full h-full">
                        {Array.from(mountedIndices)
                            .sort((a, b) => a - b)
                            .map((index) => renderImage(index, index === selectedImageIndex))}
                    </div>
                ) : (
                    <ProductImage
                        src={primaryImageUrl || ''}
                        alt={primaryImage?.alt || imageAltFallback}
                        className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105"
                        widths={imageContext?.widths}
                    />
                )}
            </Link>
            {isCyclerActive && <ImageCyclerDots count={allImages.length} activeIndex={selectedImageIndex} />}
        </div>
    );
};

export { ProductImageContainer };

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
import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ShopperSearch } from '@/scapi';
import { useDynamicImageContext } from '@/providers/dynamic-image';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { ProductImageContainer } from './index';

vi.mock('@/hooks/use-is-hydrated', () => ({
    useIsHydrated: vi.fn(() => true),
}));

vi.mock('@/components/link', () => ({
    Link: ({ children, to, ...props }: any) => (
        <a href={to} {...props}>
            {children}
        </a>
    ),
}));

vi.mock('@/lib/product/product-utils', async (importOriginal) => {
    const original = await importOriginal<object>();
    return {
        ...original,
        getImagesForColor: vi.fn(() => [
            {
                link: 'https://example.com/default1.jpg',
                disBaseLink: 'https://example.com/default1.jpg',
                alt: 'Default Image 1',
            },
            {
                link: 'https://example.com/default2.jpg',
                disBaseLink: 'https://example.com/default2.jpg',
                alt: 'Default Image 2',
            },
            {
                link: 'https://example.com/default3.jpg',
                disBaseLink: 'https://example.com/default3.jpg',
                alt: 'Default Image 3',
            },
        ]),
    };
});

vi.mock('@/providers/dynamic-image', () => ({
    useDynamicImageContext: vi.fn().mockReturnValue(null),
}));

vi.mock('./product-image', () => ({
    ProductImage: ({ src, alt, loading, priority }: any) => (
        <img
            src={src}
            alt={alt}
            data-testid="product-image"
            data-loading={loading ?? 'default'}
            data-priority={priority ?? 'default'}
        />
    ),
}));

const mockMatchMedia = (finePointer: boolean) => {
    vi.spyOn(globalThis, 'matchMedia').mockImplementation((query: string) => ({
        matches: query.includes('hover: hover') ? finePointer : false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
};

const mockProduct: ShopperSearch.schemas['ProductSearchHit'] = {
    productId: 'test-product',
    productName: 'Test Product',
    price: 99.99,
    variationAttributes: [
        {
            id: 'color',
            values: [
                { value: 'navy', name: 'Navy' },
                { value: 'red', name: 'Red' },
                { value: 'blue', name: 'Blue' },
                { value: 'black', name: 'Black' },
            ],
        },
    ],
};

describe('ProductImageContainer Dynamic Image Context Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useDynamicImageContext as Mock).mockReturnValue(null);
        mockMatchMedia(false);
    });

    test('calls addSource with product image URL when context is available', async () => {
        const mockAddSource = vi.fn();
        (useDynamicImageContext as Mock).mockReturnValue({
            addSource: mockAddSource,
            hasSource: vi.fn(),
        });

        const { getImagesForColor } = await import('@/lib/product/product-utils');
        render(<ProductImageContainer product={mockProduct} />);

        expect(mockAddSource).toHaveBeenCalledWith('https://example.com/default1.jpg');
        expect(getImagesForColor).toHaveBeenCalledWith(mockProduct, null, 'medium');
    });

    test('does not fail when no context is available', async () => {
        const { getImagesForColor } = await import('@/lib/product/product-utils');
        render(<ProductImageContainer product={mockProduct} />);
        expect(getImagesForColor).toHaveBeenCalledWith(mockProduct, null, 'medium');
    });

    test('does not call addSource when currentImageUrl is undefined', async () => {
        const mockAddSource = vi.fn();
        (useDynamicImageContext as Mock).mockReturnValue({
            addSource: mockAddSource,
            hasSource: vi.fn(),
        });

        const { getImagesForColor } = await import('@/lib/product/product-utils');
        vi.mocked(getImagesForColor).mockReturnValueOnce([]);

        render(<ProductImageContainer product={mockProduct} />);

        expect(mockAddSource).not.toHaveBeenCalled();
    });

    test('falls back to product.image when getImagesForColor returns empty array', async () => {
        const mockAddSource = vi.fn();
        (useDynamicImageContext as Mock).mockReturnValue({
            addSource: mockAddSource,
            hasSource: vi.fn(),
        });

        const { getImagesForColor } = await import('@/lib/product/product-utils');
        vi.mocked(getImagesForColor).mockReturnValueOnce([]);

        const productWithFallbackImage = {
            ...mockProduct,
            image: {
                link: 'https://example.com/fallback.jpg',
                disBaseLink: 'https://example.com/fallback-dis.jpg',
                alt: 'Fallback Image',
            },
        };

        render(<ProductImageContainer product={productWithFallbackImage} />);

        expect(getImagesForColor).toHaveBeenCalled();
        expect(mockAddSource).toHaveBeenCalledWith('https://example.com/fallback-dis.jpg');
    });
});

describe('ProductImageContainer image cycler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useDynamicImageContext as Mock).mockReturnValue(null);
        vi.mocked(useIsHydrated).mockReturnValue(true);
    });

    test('renders a single image before hydration even with multiple images available', async () => {
        mockMatchMedia(true);
        vi.mocked(useIsHydrated).mockReturnValue(false);
        const { container } = render(<ProductImageContainer product={mockProduct} />);

        expect(screen.getAllByTestId('product-image')).toHaveLength(1);
        expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    test('activates cycler after hydration with dot indicators', async () => {
        mockMatchMedia(true);
        const { container } = render(<ProductImageContainer product={mockProduct} />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    });

    test('shows the hovered image based on pointer position on desktop', async () => {
        mockMatchMedia(true);
        render(<ProductImageContainer product={mockProduct} />);

        await act(async () => {
            await Promise.resolve();
        });

        const container = screen.getByRole('link').parentElement as HTMLElement;
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
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

        act(() => {
            fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
        });

        const images = screen.getAllByTestId('product-image');
        expect(images.some((img) => img.getAttribute('src') === 'https://example.com/default2.jpg')).toBe(true);
    });

    test('lazy-loads secondary images with low priority', async () => {
        mockMatchMedia(true);
        render(<ProductImageContainer product={mockProduct} />);

        await act(async () => {
            await Promise.resolve();
        });

        const container = screen.getByRole('link').parentElement as HTMLElement;
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
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

        act(() => {
            fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
        });

        const secondaryImage = screen
            .getAllByTestId('product-image')
            .find((img) => img.getAttribute('src') === 'https://example.com/default2.jpg');

        expect(secondaryImage).toHaveAttribute('data-loading', 'lazy');
        expect(secondaryImage).toHaveAttribute('data-priority', 'low');
    });

    test('renders identically for single-image products', async () => {
        mockMatchMedia(true);
        const { getImagesForColor } = await import('@/lib/product/product-utils');
        vi.mocked(getImagesForColor).mockReturnValueOnce([
            {
                link: 'https://example.com/single.jpg',
                disBaseLink: 'https://example.com/single.jpg',
                alt: 'Single Image',
            },
        ]);

        const { container } = render(<ProductImageContainer product={mockProduct} />);

        await act(async () => {
            await Promise.resolve();
        });

        expect(screen.getAllByTestId('product-image')).toHaveLength(1);
        expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });

    test('resets to first image when selected color changes', async () => {
        mockMatchMedia(true);
        const { rerender } = render(
            <ProductImageContainer product={mockProduct} selectedColorValue="navy" />
        );

        await act(async () => {
            await Promise.resolve();
        });

        const container = screen.getByRole('link').parentElement as HTMLElement;
        vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
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

        act(() => {
            fireEvent.mouseMove(container, { clientX: 100, clientY: 100 });
        });

        rerender(<ProductImageContainer product={mockProduct} selectedColorValue="red" />);

        const primaryImage = screen.getAllByTestId('product-image')[0];
        expect(primaryImage).toHaveAttribute('src', 'https://example.com/default1.jpg');
    });
});

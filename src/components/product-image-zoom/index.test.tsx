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

import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductImageZoom from './index';
import type { ProductImage } from './types';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { mockConfig } from '@/test-utils/config';

vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}));

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

const mockImages: ProductImage[] = [
    { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
    { src: 'https://example.com/image2.jpg', alt: 'Image 2' },
];

const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(ConfigProvider, { config: mockConfig } as never, children);

const setFinePointer = (matches: boolean) => {
    globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === FINE_POINTER_QUERY ? matches : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }));
};

const getTransformLayer = (container: HTMLElement): HTMLElement => {
    const layer = container.querySelector('.will-change-transform');
    if (!layer) {
        throw new Error('Transform layer not found');
    }
    return layer as HTMLElement;
};

describe('ProductImageZoom', () => {
    let originalMatchMedia: typeof globalThis.matchMedia;

    beforeEach(() => {
        originalMatchMedia = globalThis.matchMedia;
        setFinePointer(true);
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 400,
            bottom: 400,
            width: 400,
            height: 400,
            toJSON: () => ({}),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        globalThis.matchMedia = originalMatchMedia;
    });

    it('applies a hover transform on fine-pointer devices', () => {
        const { container } = render(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={0}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />,
            { wrapper }
        );

        const zoomTarget = screen.getByRole('button', { name: /product image/i });
        fireEvent.mouseEnter(zoomTarget, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(zoomTarget, { clientX: 100, clientY: 100 });

        const transform = getTransformLayer(container).style.transform;
        expect(transform).toBe('scale(2)');
        expect(getTransformLayer(container).style.transformOrigin).toBe('25% 25%');
    });

    it('resets hover transform when the cursor leaves', () => {
        const { container } = render(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={0}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />,
            { wrapper }
        );

        const zoomTarget = screen.getByRole('button', { name: /product image/i });
        fireEvent.mouseEnter(zoomTarget, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(zoomTarget, { clientX: 100, clientY: 100 });
        fireEvent.mouseLeave(zoomTarget);

        expect(getTransformLayer(container).style.transform).toBe('scale(1)');
        expect(getTransformLayer(container).style.transformOrigin).toBe('center center');
    });

    it('anchors hover zoom to the cursor so edges are reachable', () => {
        const { container } = render(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={0}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />,
            { wrapper }
        );

        const zoomTarget = screen.getByRole('button', { name: /product image/i });
        fireEvent.mouseEnter(zoomTarget, { clientX: 0, clientY: 200 });
        fireEvent.mouseMove(zoomTarget, { clientX: 0, clientY: 200 });

        const leftEdgeLayer = getTransformLayer(container);
        expect(leftEdgeLayer.style.transform).toBe('scale(2)');
        expect(leftEdgeLayer.style.transformOrigin).toBe('0% 50%');

        fireEvent.mouseMove(zoomTarget, { clientX: 400, clientY: 200 });

        const rightEdgeLayer = getTransformLayer(container);
        expect(rightEdgeLayer.style.transform).toBe('scale(2)');
        expect(rightEdgeLayer.style.transformOrigin).toBe('100% 50%');
    });

    it('toggles keyboard zoom at 150% with Enter and exits with Escape', () => {
        const { container } = render(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={0}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />,
            { wrapper }
        );

        const zoomTarget = screen.getByRole('button', { name: /product image/i });

        fireEvent.keyDown(zoomTarget, { key: 'Enter' });
        expect(getTransformLayer(container).style.transform).toBe('translate(0%, 0%) scale(1.5)');
        expect(zoomTarget).toHaveAttribute('aria-pressed', 'true');

        fireEvent.keyDown(zoomTarget, { key: 'Escape' });
        expect(getTransformLayer(container).style.transform).toBe('scale(1)');
        expect(getTransformLayer(container).style.transformOrigin).toBe('center center');
        expect(zoomTarget).toHaveAttribute('aria-pressed', 'false');
    });

    it('resets zoom when the selected image index changes', () => {
        const { container, rerender } = render(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={0}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />,
            { wrapper }
        );

        const zoomTarget = screen.getByRole('button', { name: /product image/i });
        fireEvent.keyDown(zoomTarget, { key: ' ' });

        rerender(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={1}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />
        );

        expect(getTransformLayer(container).style.transform).toBe('scale(1)');
        expect(getTransformLayer(container).style.transformOrigin).toBe('center center');
    });

    it('does not apply hover zoom on coarse-pointer devices', () => {
        setFinePointer(false);

        const { container } = render(
            <ProductImageZoom
                images={mockImages}
                selectedImageIndex={0}
                altFallback="Product Image"
                widths={{ base: 680 }}
            />,
            { wrapper }
        );

        const zoomTarget = screen.getByRole('button', { name: /product image/i });
        fireEvent.mouseEnter(zoomTarget, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(zoomTarget, { clientX: 100, clientY: 100 });

        expect(getTransformLayer(container).style.transform).toBe('scale(1)');
        expect(getTransformLayer(container).style.transformOrigin).toBe('center center');
    });
});

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
import { createRef } from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import StickyAddToCartBar from './index';
import { MOBILE_VIEWPORT_QUERY } from '@/hooks/use-is-mobile-viewport';

vi.mock('@/hooks/use-sticky-atc-anchor-visible', () => ({
    useStickyAtcAnchorVisible: vi.fn(() => true),
}));

import { useStickyAtcAnchorVisible } from '@/hooks/use-sticky-atc-anchor-visible';

const mockUseStickyAtcAnchorVisible = vi.mocked(useStickyAtcAnchorVisible);

describe('StickyAddToCartBar', () => {
    let originalMatchMedia: typeof globalThis.matchMedia;

    const defaultProps = {
        atcAnchorRef: createRef<HTMLButtonElement>(),
        productName: 'Classic T-Shirt',
        summary: 'Size: M · Colour: Black',
        canAddToCart: true,
        isAdding: false,
        onAddToCart: vi.fn(),
        addToCartLabel: 'Add to Cart',
        selectOptionsLabel: 'Select Options',
        addingLabel: 'Adding...',
    };

    beforeEach(() => {
        originalMatchMedia = globalThis.matchMedia;
        mockUseStickyAtcAnchorVisible.mockReturnValue(true);

        globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === MOBILE_VIEWPORT_QUERY,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as typeof globalThis.matchMedia;

        defaultProps.atcAnchorRef = createRef<HTMLButtonElement>();
        defaultProps.onAddToCart = vi.fn();
    });

    afterEach(() => {
        globalThis.matchMedia = originalMatchMedia;
        vi.clearAllMocks();
    });

    test('renders nothing during server-side rendering', () => {
        const html = renderToString(<StickyAddToCartBar {...defaultProps} />);
        expect(html).toBe('');
    });

    test('shows bar on mobile when native ATC is not visible', async () => {
        mockUseStickyAtcAnchorVisible.mockReturnValue(false);

        render(<StickyAddToCartBar {...defaultProps} />);

        await waitFor(() => {
            expect(mockUseStickyAtcAnchorVisible).toHaveBeenCalled();
        });

        const panel = screen.getByTestId('sticky-add-to-cart-bar-panel');
        expect(panel).toHaveClass('translate-y-0');
        expect(screen.getByTestId('sticky-add-to-cart-bar')).toHaveAttribute('aria-hidden', 'false');
    });

    test('hides bar when native ATC is visible', async () => {
        mockUseStickyAtcAnchorVisible.mockReturnValue(true);

        render(<StickyAddToCartBar {...defaultProps} />);

        await waitFor(() => {
            expect(mockUseStickyAtcAnchorVisible).toHaveBeenCalled();
        });

        const panel = screen.getByTestId('sticky-add-to-cart-bar-panel');
        expect(panel).toHaveClass('translate-y-full');
        expect(panel).toHaveClass('invisible');
    });

    test('stays hidden on desktop viewports', async () => {
        globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })) as typeof globalThis.matchMedia;

        mockUseStickyAtcAnchorVisible.mockReturnValue(false);

        render(<StickyAddToCartBar {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByTestId('sticky-add-to-cart-bar')).toBeInTheDocument();
        });

        const panel = screen.getByTestId('sticky-add-to-cart-bar-panel');
        expect(panel).toHaveClass('translate-y-full');
    });

    test('shows Select Options label when canAddToCart is false', async () => {
        mockUseStickyAtcAnchorVisible.mockReturnValue(false);

        render(<StickyAddToCartBar {...defaultProps} canAddToCart={false} />);

        await waitFor(() => {
            expect(screen.getByTestId('sticky-add-to-cart')).toHaveTextContent('Select Options');
        });

        expect(screen.getByTestId('sticky-add-to-cart')).toBeDisabled();
    });

    test('calls onAddToCart when sticky button is clicked', async () => {
        const user = userEvent.setup();
        const onAddToCart = vi.fn();
        mockUseStickyAtcAnchorVisible.mockReturnValue(false);

        render(<StickyAddToCartBar {...defaultProps} onAddToCart={onAddToCart} />);

        await user.click(screen.getByTestId('sticky-add-to-cart'));

        expect(onAddToCart).toHaveBeenCalledTimes(1);
    });
});

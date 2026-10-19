/**
 * CartContext — Global cart state for PrepMagnet
 *
 * Provides:
 *   cart          — { items, subtotal, total_items, coins_available, cart_id }
 *   cartCount     — number of items (for badge in Navbar)
 *   addToCart(courseId)
 *   removeFromCart(courseId)
 *   clearCart()
 *   refreshCart()
 *   isInCart(courseId) → bool
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const EMPTY_CART = { items: [], subtotal: 0, total_items: 0, coins_available: 0, cart_id: null };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCart(EMPTY_CART);
      return;
    }
    try {
      setLoading(true);
      const data = await api.cart.get();
      setCart(data || EMPTY_CART);
    } catch {
      // Silently degrade — cart is non-critical
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Reload cart when user logs in / out
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (courseId) => {
    const result = await api.cart.addItem(courseId);
    await refreshCart();
    return result;
  }, [refreshCart]);

  const removeFromCart = useCallback(async (courseId) => {
    await api.cart.removeItem(courseId);
    await refreshCart();
  }, [refreshCart]);

  const clearCart = useCallback(async () => {
    await api.cart.clear();
    setCart(EMPTY_CART);
  }, []);

  const isInCart = useCallback(
    (courseId) => cart.items?.some((i) => i.course_id === courseId),
    [cart.items]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount: cart.total_items || 0,
        loading,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}

"use client";

import { create } from "zustand";

import { Prediction, StockPricePoint } from "@/types";

type StockStoreState = {
  activeSymbol: string;
  prices: Record<string, StockPricePoint[]>;
  prediction: Record<string, Prediction | null>;
  setActiveSymbol: (symbol: string) => void;
  setPrices: (symbol: string, prices: StockPricePoint[]) => void;
  appendPrice: (price: StockPricePoint) => void;
  setPrediction: (symbol: string, prediction: Prediction | null) => void;
};

export const useStockStore = create<StockStoreState>((set) => ({
  activeSymbol: "AAPL",
  prices: {},
  prediction: {},
  setActiveSymbol: (symbol) =>
    set((state) => {
      const nextSymbol = symbol.toUpperCase();
      if (state.activeSymbol === nextSymbol) {
        return state;
      }

      return { activeSymbol: nextSymbol };
    }),
  setPrices: (symbol, prices) =>
    set((state) => {
      const normalizedSymbol = symbol.toUpperCase();
      if (state.prices[normalizedSymbol] === prices) {
        return state;
      }

      return {
        prices: {
          ...state.prices,
          [normalizedSymbol]: prices
        }
      };
    }),
  appendPrice: (price) =>
    set((state) => {
      const symbol = price.symbol.toUpperCase();
      const current = state.prices[symbol] ?? [];
      const deduped = current.filter((entry) => entry.timestamp !== price.timestamp);
      const next = [...deduped, price].sort(
        (left, right) =>
          new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()
      );
      return {
        prices: {
          ...state.prices,
          [symbol]: next
        }
      };
    }),
  setPrediction: (symbol, prediction) =>
    set((state) => {
      const normalizedSymbol = symbol.toUpperCase();
      if (state.prediction[normalizedSymbol] === prediction) {
        return state;
      }

      return {
        prediction: {
          ...state.prediction,
          [normalizedSymbol]: prediction
        }
      };
    })
}));

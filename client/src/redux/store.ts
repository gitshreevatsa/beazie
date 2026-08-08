import { configureStore } from "@reduxjs/toolkit";
import localforage from "localforage";
import { combineReducers } from "redux";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";
import tokenSlice from "./slices/tokenSlice";

const combinedReducer = combineReducers({
  tokens: tokenSlice,
});

const persistConfig = {
  key: "redux",
  storage: localforage,
};

const persistedReducer = persistReducer(persistConfig, combinedReducer);

localforage.config({
  driver: localforage.INDEXEDDB,
  name: "incasino",
  storeName: "incasino",
  version: 1.0,
  description: "Incasino store",
});

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

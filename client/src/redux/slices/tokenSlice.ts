import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TokenState {
  token: string;
}

const initialState: TokenState = {
  token: "0",
};

const tokenSlice = createSlice({
  name: "token",
  initialState,
  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
    resetToken: (state) => {
      state.token = "0";
    },
  },
});

export const { setToken, resetToken } = tokenSlice.actions;
export default tokenSlice.reducer;

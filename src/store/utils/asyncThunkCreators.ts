import { createSlice, createAsyncThunk, AsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Draft } from '@reduxjs/toolkit';

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

interface AsyncSliceConfig<T, Args = void> {
  name: string;
  initialState: AsyncState<T>;
  asyncFn: (args: Args) => Promise<T>;
  reducers?: any;
}

export const createAsyncSlice = <T, Args = void>({
  name,
  initialState,
  asyncFn,
  reducers = {}
}: AsyncSliceConfig<T, Args>) => {
  const asyncThunk = createAsyncThunk(
    `${name}/loadData`,
    async (args: Args) => {
      return await asyncFn(args);
    }
  );

  return {
    slice: createSlice({
      name,
      initialState,
      reducers,
      extraReducers: (builder) => {
        builder
          .addCase(asyncThunk.pending, (state) => {
            state.loading = true;
            state.error = null;
          })
          .addCase(asyncThunk.fulfilled, (state, action) => {
            state.data = action.payload as Draft<T>;
            state.loading = false;
          })
          .addCase(asyncThunk.rejected, (state, action) => {
            state.loading = false;
            state.error = action.error.message || `Failed to load ${name}`;
          });
      }
    }),
    thunk: asyncThunk
  };
};
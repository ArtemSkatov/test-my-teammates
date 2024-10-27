
import { MyQueryClientProvider } from "./providers/MyQueryClientProvider/MyQueryClientProvider";
import { MyReduxProvider } from "./providers/MyReduxProvider/MyReduxProvider";
import { store } from "./store";

function App() {
  return (
    <MyReduxProvider store={store}>
      <MyQueryClientProvider>
        test
      </MyQueryClientProvider>
    </MyReduxProvider>
  );
};

export default App;

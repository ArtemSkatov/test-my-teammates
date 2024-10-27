import { Store, UnknownAction } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

export const MyReduxProvider = ({ children, store }: { children: React.ReactNode, store: Store<unknown, UnknownAction, unknown> }) => {
    return (
        <Provider store={store}>
            {children}
        </Provider>
    );
};

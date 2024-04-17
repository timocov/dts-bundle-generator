type ThirdType = number;

type SecondType<T, V> = T extends any ? V : FirstType<T>;

export type FirstType<T> = SecondType<ThirdType, T>;

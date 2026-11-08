// @ts-expect-error the member does not exist on purpose
export type Missing = import('./existing').DoesNotExist;

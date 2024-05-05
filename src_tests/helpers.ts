export function sleep(ms = 5) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

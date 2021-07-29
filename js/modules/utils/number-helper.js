export class NumberHelper {
    static uintConversion(value, maximum) {
        return (value >= 0)
            ? value % maximum
            : maximum + value;
    }

    static intConversion(value, maximum) {
        return (maximum >> 1 & value)
            ? value - maximum
            : value % (maximum >> 1);
    }

    static intToBase(bits, base, value) {
        if (typeof value != 'number') {
            return '0';
        }

        const maximum = Math.pow(2, bits);
        return NumberHelper.uintConversion(value, maximum).toString(base);
    }

    static signedInt(bits, value) {
        if (typeof value != 'number') {
            return 0;
        }

        const maximum = Math.pow(2, bits);
        return NumberHelper.intConversion(value, maximum);
    }
}

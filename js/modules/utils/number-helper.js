export class NumberHelper {
    static intToBase(bits, base, value) {
        if (typeof value != 'number') {
            return '0';
        }

        return BigInt.asUintN(bits, BigInt(value)).toString(base);
    }

    static signedInt(bits, value) {
        if (typeof value != 'number') {
            return 0;
        }

        return BigInt.asIntN(bits, BigInt(value));
    }
}

package android_serialport_api;

public class Public {

    static public int isOdd(int num) {
        return num & 0x1;
    }

    static public int HexToInt(String inHex) {
        return Integer.parseInt(inHex, 16);
    }

    static public byte HexToByte(String inHex) {
        return (byte) Integer.parseInt(inHex, 16);
    }

    static public String HextoBinary(String inHex) {
        if (inHex == null || inHex.equals("") || inHex.length() % 2 != 0)
            return null;

        StringBuffer sb = new StringBuffer();
        for (int i = 0; i < inHex.length(); i += 2) {
            Integer nI = Integer.parseInt(inHex.substring(i, i + 2), 16);
            for (int j = 0; j < 8; j++) {
                sb.insert(0, nI & 1);
                nI = nI >>> 1;
            }
        }
        return sb.toString();
    }

    static public String Byte2Hex(Byte inByte) {
        return String.format("%02x", inByte).toUpperCase();
    }

    static public String ByteArrToHex(byte[] inBytArr) {
        StringBuilder strBuilder = new StringBuilder();
        int j = inBytArr.length;
        for (int i = 0; i < j; i++) {
            strBuilder.append(Byte2Hex(inBytArr[i]));
        }
        return strBuilder.toString();
    }

    static public String ByteArrToHex(byte[] inBytArr, int offset, int byteCount) {
        StringBuilder strBuilder = new StringBuilder();
        int j = byteCount;
        for (int i = offset; i < j; i++) {
            strBuilder.append(Byte2Hex(inBytArr[i]));
        }
        return strBuilder.toString();
    }

    static public byte[] HexToByteArr(String inHex) {
        int hexlen = inHex.length();
        byte[] result;
        if (isOdd(hexlen) == 1) {
            hexlen++;
            result = new byte[(hexlen / 2)];
            inHex = "0" + inHex;
        } else {
            result = new byte[(hexlen / 2)];
        }
        int j = 0;
        for (int i = 0; i < hexlen; i += 2) {
            result[j] = HexToByte(inHex.substring(i, i + 2));
            j++;
        }
        return result;
    }
}

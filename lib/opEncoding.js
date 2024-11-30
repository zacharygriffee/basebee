import c from "compact-encoding";
import b4a from "b4a";

export const opEncoding = {
    preencode(state, obj) {
        let {
            value,
            key = b4a.alloc(0),
            timestamp,
            op = "put",
            ops,
            index = false
        } = obj;

        if (typeof op !== "string") {
            throw new Error("op must be passed");
        }

        if (!key) {
            throw new Error("key is required for op");
        }

        c.string.fixed(3).preencode(state, op);
        if (op !== "bch") c.uint64.preencode(state, timestamp);
        [value, key].forEach(o => c.binary.preencode(state, o));
        if (op === "add") {
            c.bool.preencode(state, index);
        }
        if (op === "bch") {
            c.array(opEncoding).preencode(state, ops)
        }
    },
    encode(state, obj) {
        const {
            value,
            key = b4a.alloc(0),
            timestamp,
            op = "put",
            ops,
            index = false
        } = obj;
        c.string.fixed(3).encode(state, op);
        if (op !== "bch") c.uint64.encode(state, timestamp);
        [value, key].forEach(o => c.binary.encode(state, o));
        if (op === "add") {
            c.bool.encode(state, index);
        }
        if (op === "bch") {
            c.array(opEncoding).encode(state, ops)
        }
    },
    decode(buff) {
        const op = c.string.fixed(3).decode(buff);
        const value = c.binary.decode(buff);
        const key = c.binary.decode(buff);
        const timestamp = op === "bch" ? undefined : c.binary.decode(buff);
        let index = false;
        if (["add", "rmv"].find(op)) {
            index = c.bool.decode(buff);
        }
        let ops;
        if (op === "bch") {
            ops = c.array(opEncoding).decode(buff);
        }
        return {
            op, value, key, timestamp, ops
        }
    }
};

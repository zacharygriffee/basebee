import SubEncoder from "sub-encoder";
import c from "compact-encoding";

export const keyEncoder = new SubEncoder();
export const timeStampEncoder = c.from(keyEncoder.sub("__bb_tmsmp__"));
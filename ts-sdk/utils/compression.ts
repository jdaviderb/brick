// used this to be able to use getConcurrentMerkleTreeAccountSize in a browser
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
import { PublicKey } from '@solana/web3.js';

export function getConcurrentMerkleTreeAccountSize(
    maxDepth: number,
    maxBufferSize: number,
    canopyDepth?: number,
    headerVersion = 'V1'
): number {
    if (headerVersion != 'V1') {
        throw Error('Unsupported header version');
    }

    // The additional 2 bytes are needed for
    // - the account disciminant  (1 byte)
    // - the header version       (1 byte)
    return (
        2 +
        concurrentMerkleTreeHeaderDataV1Beet.byteSize +
        concurrentMerkleTreeBeetFactory(maxDepth, maxBufferSize).byteSize +
        (canopyDepth ? canopyBeetFactory(canopyDepth).byteSize : 0)
    );
}

type ConcurrentMerkleTreeHeaderDataV1 = {
    maxBufferSize: number;
    maxDepth: number;
    authority: PublicKey;
    creationSlot: beet.bignum;
    padding: number[] /* size: 6 */;
};

const concurrentMerkleTreeHeaderDataV1Beet = new beet.BeetArgsStruct<ConcurrentMerkleTreeHeaderDataV1>(
    [
        ['maxBufferSize', beet.u32],
        ['maxDepth', beet.u32],
        ['authority', beetSolana.publicKey],
        ['creationSlot', beet.u64],
        ['padding', beet.uniformFixedSizeArray(beet.u8, 6)],
    ],
    'ConcurrentMerkleTreeHeaderDataV1'
);


type Path = {
    proof: PublicKey[];
    leaf: PublicKey;
    index: number;
    _padding: number;
}

type ConcurrentMerkleTree = {
    sequenceNumber: beet.bignum; // u64
    activeIndex: beet.bignum; // u64
    bufferSize: beet.bignum; // u64
    changeLogs: ChangeLogInternal[];
    rightMostPath: Path;
};

const concurrentMerkleTreeBeetFactory = (maxDepth: number, maxBufferSize: number) => {
    return new beet.BeetArgsStruct<ConcurrentMerkleTree>(
        [
            ['sequenceNumber', beet.u64],
            ['activeIndex', beet.u64],
            ['bufferSize', beet.u64],
            ['changeLogs', beet.uniformFixedSizeArray(changeLogBeetFactory(maxDepth), maxBufferSize)],
            ['rightMostPath', pathBeetFactory(maxDepth)],
        ],
        'ConcurrentMerkleTree'
    );
};

type ChangeLogInternal = {
    root: PublicKey;
    pathNodes: PublicKey[];
    index: number; // u32
    _padding: number; // u32
};

const changeLogBeetFactory = (maxDepth: number) => {
    return new beet.BeetArgsStruct<ChangeLogInternal>(
        [
            ['root', beetSolana.publicKey],
            ['pathNodes', beet.uniformFixedSizeArray(beetSolana.publicKey, maxDepth)],
            ['index', beet.u32],
            ['_padding', beet.u32],
        ],
        'ChangeLog'
    );
};

const pathBeetFactory = (maxDepth: number) => {
    return new beet.BeetArgsStruct<Path>(
        [
            ['proof', beet.uniformFixedSizeArray(beetSolana.publicKey, maxDepth)],
            ['leaf', beetSolana.publicKey],
            ['index', beet.u32],
            ['_padding', beet.u32],
        ],
        'Path'
    );
};

type Canopy = {
    canopyBytes: number[];
};

const canopyBeetFactory = (canopyDepth: number) => {
    return new beet.BeetArgsStruct<Canopy>(
        [['canopyBytes', beet.uniformFixedSizeArray(beet.u8, Math.max(((1 << (canopyDepth + 1)) - 2) * 32, 0))]],
        'Canopy'
    );
};



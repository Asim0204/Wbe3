pragma circom 2.0.0;

include "circomlib/circuits/eddsa.circom";
include "circomlib/circuits/mimc.circom";
include "circomlib/circuits/bitify.circom";

// Merkle tree update proof component
template MerkleUpdateProof(depth) {
    signal input inRoot;
    signal input txData[8]; // Transaction fields
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal input oldLeaf;
    signal output outRoot;
    
    component hasher[depth + 1];
    component selector[depth];
    
    // Hash the transaction data to get new leaf
    hasher[0] = MiMC7(8);
    for (var i = 0; i < 8; i++) {
        hasher[0].x_in[i] <== txData[i];
    }
    hasher[0].k <== 0;
    
    signal newLeaf;
    newLeaf <== hasher[0].out;
    
    // Merkle path verification and update
    signal roots[depth + 1];
    roots[0] <== newLeaf;
    
    for (var i = 0; i < depth; i++) {
        selector[i] = MultiMux1(2);
        selector[i].c[0][0] <== roots[i];
        selector[i].c[0][1] <== pathElements[i];
        selector[i].c[1][0] <== pathElements[i];
        selector[i].c[1][1] <== roots[i];
        selector[i].s <== pathIndices[i];
        
        hasher[i + 1] = MiMC7(2);
        hasher[i + 1].x_in[0] <== selector[i].out[0];
        hasher[i + 1].x_in[1] <== selector[i].out[1];
        hasher[i + 1].k <== 0;
        
        roots[i + 1] <== hasher[i + 1].out;
    }
    
    outRoot <== roots[depth];
}

// Multi-multiplexer component
template MultiMux1(choices) {
    signal input c[choices][2];
    signal input s;
    signal output out[2];
    
    component mux[2];
    for (var i = 0; i < 2; i++) {
        mux[i] = Mux1();
        mux[i].c[0] <== c[0][i];
        mux[i].c[1] <== c[1][i];
        mux[i].s <== s;
        out[i] <== mux[i].out;
    }
}

// Main circuit component
template TransactionVerifier(depth, txFieldCount) {
    // Public inputs
    signal input prevRoot;
    signal input newRoot;
    
    // Private inputs  
    signal private input txFields[txFieldCount];
    signal private input ownerPubKey[2];
    signal private input sigR8[2];
    signal private input sigS;
    signal private input pathElements[depth];
    signal private input pathIndices[depth];
    signal private input oldLeaf;
    
    // EdDSA signature verification
    component eddsa = EdDSAVerifier();
    eddsa.enabled <== 1;
    eddsa.Ax <== ownerPubKey[0];
    eddsa.Ay <== ownerPubKey[1];
    eddsa.R8x <== sigR8[0];
    eddsa.R8y <== sigR8[1];
    eddsa.S <== sigS;
    
    // Hash transaction fields for signing
    component txHasher = MiMC7(txFieldCount);
    for (var i = 0; i < txFieldCount; i++) {
        txHasher.x_in[i] <== txFields[i];
    }
    txHasher.k <== 0;
    eddsa.M <== txHasher.out;
    
    // Merkle inclusion proof and update
    component proof = MerkleUpdateProof(depth);
    proof.inRoot <== prevRoot;
    for (var i = 0; i < 8; i++) {
        if (i < txFieldCount) {
            proof.txData[i] <== txFields[i];
        } else {
            proof.txData[i] <== 0;
        }
    }
    for (var i = 0; i < depth; i++) {
        proof.pathElements[i] <== pathElements[i];
        proof.pathIndices[i] <== pathIndices[i];
    }
    proof.oldLeaf <== oldLeaf;
    
    // Constrain that computed new root matches public input
    newRoot === proof.outRoot;
}

// Instantiate main component
component main = TransactionVerifier(20, 6);
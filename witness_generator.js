const circomlib = require("circomlib");
const snarkjs = require("snarkjs");
const crypto = require("crypto");

// Helper function to generate EdDSA signature
function generateEdDSASignature(privateKey, message) {
    const eddsa = circomlib.eddsa;
    const signature = eddsa.signMiMC(privateKey, message);
    return {
        R8: signature.R8,
        S: signature.S
    };
}

// Helper function to create Merkle tree path
function generateMerklePath(leafIndex, depth) {
    const pathElements = [];
    const pathIndices = [];
    
    let currentIndex = leafIndex;
    for (let i = 0; i < depth; i++) {
        // Generate random path elements for demo
        pathElements.push(crypto.randomBytes(32).toString('hex'));
        pathIndices.push(currentIndex % 2);
        currentIndex = Math.floor(currentIndex / 2);
    }
    
    return { pathElements, pathIndices };
}

// Generate witness data for the circuit
async function generateWitness() {
    // Private key for EdDSA (32 bytes)
    const privateKey = crypto.randomBytes(32);
    const publicKey = circomlib.eddsa.prv2pub(privateKey);
    
    // Transaction fields (example)
    const txFields = [
        "123456789", // from address (as field element)
        "987654321", // to address  
        "1000",      // amount
        "42",        // nonce
        "1699123456", // timestamp
        "0"          // fee
    ];
    
    // Create message hash for signing
    const messageHash = circomlib.mimc7.multiHash(txFields, 0);
    
    // Generate EdDSA signature
    const signature = generateEdDSASignature(privateKey, messageHash);
    
    // Generate Merkle tree data
    const depth = 20;
    const leafIndex = 123; // Example leaf position
    const { pathElements, pathIndices } = generateMerklePath(leafIndex, depth);
    
    // Circuit inputs
    const input = {
        // Public inputs
        prevRoot: "12345678901234567890123456789012345678901234567890123456789012345678",
        newRoot: "87654321098765432109876543210987654321098765432109876543210987654321",
        
        // Private inputs
        txFields: txFields,
        ownerPubKey: [publicKey[0].toString(), publicKey[1].toString()],
        sigR8: [signature.R8[0].toString(), signature.R8[1].toString()],
        sigS: signature.S.toString(),
        pathElements: pathElements,
        pathIndices: pathIndices,
        oldLeaf: "11111111111111111111111111111111111111111111111111111111111111111111"
    };
    
    return input;
}

// Main function
async function main() {
    try {
        console.log("Generating witness data...");
        const input = await generateWitness();
        
        console.log("Input generated:");
        console.log(JSON.stringify(input, null, 2));
        
        // Save to file for circuit compilation
        require('fs').writeFileSync('./input.json', JSON.stringify(input, null, 2));
        console.log("Input saved to input.json");
        
    } catch (error) {
        console.error("Error generating witness:", error);
    }
}

if (require.main === module) {
    main();
}

module.exports = { generateWitness };
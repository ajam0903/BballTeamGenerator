import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase"; // Make sure to import storage from your firebase config
import { StyledButton, StyledInput } from "./UIComponents";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function PlayerCardClaimModal({
    isOpen,
    onClose,
    playerName,
    user,
    currentLeagueId,
    currentLeague,
    db,
    onClaimSuccess
}) {
    // Unit system toggle
    const [useMetric, setUseMetric] = useState(false);

    // Height fields
    const [heightFeet, setHeightFeet] = useState("");
    const [heightInches, setHeightInches] = useState("");
    const [heightCm, setHeightCm] = useState("");

    // Weight field
    const [weight, setWeight] = useState("");

    // Photo handling
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [customPhoto, setCustomPhoto] = useState("");
    const [useFileUpload, setUseFileUpload] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [isLoading, setIsLoading] = useState(false);
    const [isAlreadyClaimed, setIsAlreadyClaimed] = useState(false);
    const [claimStatus, setClaimStatus] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5,
        aspect: 1 // Square crop for profile photos
    });
    const [completedCrop, setCompletedCrop] = useState(null);
    const [previewCanvasRef, setPreviewCanvasRef] = useState(null);

    useEffect(() => {
        if (isOpen && user && playerName) {
            checkClaimStatus();
            loadExistingProfile();
        }
    }, [isOpen, user, playerName]);

    const checkClaimStatus = async () => {
        try {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const claimedPlayers = userData.claimedPlayers || [];
                const existingClaim = claimedPlayers.find(
                    claim => claim.leagueId === currentLeagueId &&
                        claim.playerName.toLowerCase() === playerName.toLowerCase()
                );

                if (existingClaim) {
                    setIsAlreadyClaimed(true);
                    setClaimStatus(existingClaim.status || 'pending');

                    // Parse existing height data
                    if (existingClaim.height) {
                        parseHeightData(existingClaim.height);
                    }

                    setWeight(existingClaim.weight || "");
                    setCustomPhoto(existingClaim.customPhotoURL || "");
                    if (existingClaim.customPhotoURL) {
                        setPhotoPreview(existingClaim.customPhotoURL);
                    }
                }
            }
        } catch (error) {
            console.error("Error checking claim status:", error);
        }
    };

    const parseHeightData = (heightString) => {
        if (!heightString) return;

        // Check if it's in feet/inches format (e.g., "6'2\"" or "6 ft 2 in")
        const feetInchesMatch = heightString.match(/(\d+)['ft\s]*\s*(\d+)?["in]?/i);
        if (feetInchesMatch) {
            setHeightFeet(feetInchesMatch[1] || "");
            setHeightInches(feetInchesMatch[2] || "");
            setUseMetric(false);
        } else {
            // Assume it's in cm
            const cmMatch = heightString.match(/(\d+)/);
            if (cmMatch) {
                setHeightCm(cmMatch[1]);
                setUseMetric(true);
            }
        }
    };

    const loadExistingProfile = async () => {
        try {
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const profile = userData.profile || {};
                if (!isAlreadyClaimed) {
                    if (profile.height) {
                        parseHeightData(profile.height);
                    }
                    setWeight(profile.weight || "");
                    setCustomPhoto(profile.customPhotoURL || "");
                    if (profile.customPhotoURL) {
                        setPhotoPreview(profile.customPhotoURL);
                    }
                }
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    };

    const handlePhotoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Validate file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('Please select an image smaller than 5MB');
                return;
            }

            // Create image URL for cropping
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageToCrop(e.target.result);
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const onImageLoaded = (image) => {
        const canvas = document.createElement('canvas');
        setPreviewCanvasRef(canvas);
        return false; // Return false when setting crop state in here.
    };

    const onCropComplete = (crop) => {
        setCompletedCrop(crop);
    };

    const onCropChange = (crop, percentCrop) => {
        setCrop(percentCrop);
    };

    const getCroppedImg = (image, crop, fileName) => {
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = crop.width;
        canvas.height = crop.height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            crop.width * scaleX,
            crop.height * scaleY,
            0,
            0,
            crop.width,
            crop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    return;
                }
                blob.name = fileName;
                resolve(blob);
            }, 'image/jpeg', 0.8);
        });
    };

    const handleCropSave = async () => {
        if (!completedCrop || !imageToCrop) return;

        const image = document.querySelector('#crop-image');
        if (!image) return;

        try {
            const croppedImageBlob = await getCroppedImg(image, completedCrop, 'cropped-image.jpg');

            // Create a File object from the blob
            const croppedFile = new File([croppedImageBlob], 'cropped-image.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
            });

            setPhotoFile(croppedFile);

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
                setPhotoPreview(e.target.result);
            };
            reader.readAsDataURL(croppedFile);

            setShowCropModal(false);
            setImageToCrop(null);
        } catch (error) {
            console.error('Error cropping image:', error);
            alert('Failed to crop image. Please try again.');
        }
    };

    const compressImage = (file, maxWidth = 400, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calculate new dimensions
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;

                // Draw and compress
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                canvas.toBlob(resolve, 'image/jpeg', quality);
            };

            img.src = URL.createObjectURL(file);
        });
    };

    const uploadPhoto = async (file) => {
        try {
            // Compress the image
            const compressedFile = await compressImage(file);

            // Create a reference to the storage location
            const storageRef = ref(storage, `player-photos/${user.uid}/${Date.now()}_${file.name}`);

            // Upload the file
            setUploadProgress(10);
            const snapshot = await uploadBytes(storageRef, compressedFile);
            setUploadProgress(90);

            // Get the download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            setUploadProgress(100);

            return downloadURL;
        } catch (error) {
            console.error("Error uploading photo:", error);
            throw error;
        }
    };

    const formatHeight = () => {
        if (useMetric) {
            return heightCm ? `${heightCm} cm` : "";
        } else {
            if (heightFeet || heightInches) {
                const feet = heightFeet || "0";
                const inches = heightInches || "0";
                return `${feet}'${inches}"`;
            }
            return "";
        }
    };

    const handleClaim = async () => {
        if (!user || !playerName) return;

        setIsLoading(true);
        try {
            let photoURL = customPhoto;

            // Upload photo if user selected a file
            if (useFileUpload && photoFile) {
                photoURL = await uploadPhoto(photoFile);
            }

            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const claimedPlayers = userData.claimedPlayers || [];

                const formattedHeight = formatHeight();

                const claimData = {
                    leagueId: currentLeagueId,
                    playerName: playerName,
                    claimedAt: new Date().toISOString(),
                    status: 'pending',
                    height: formattedHeight,
                    weight: weight.trim(),
                    customPhotoURL: photoURL || null
                };

                const existingClaimIndex = claimedPlayers.findIndex(
                    claim => claim.leagueId === currentLeagueId &&
                        claim.playerName.toLowerCase() === playerName.toLowerCase()
                );

                let updatedClaimedPlayers;
                if (existingClaimIndex >= 0) {
                    updatedClaimedPlayers = [...claimedPlayers];
                    updatedClaimedPlayers[existingClaimIndex] = {
                        ...updatedClaimedPlayers[existingClaimIndex],
                        ...claimData,
                        status: claimStatus === 'approved' ? 'approved' : 'pending'
                    };
                } else {
                    updatedClaimedPlayers = [...claimedPlayers, claimData];
                }

                await setDoc(userRef, {
                    ...userData,
                    claimedPlayers: updatedClaimedPlayers,
                    profile: {
                        ...userData.profile,
                        height: formattedHeight,
                        weight: weight.trim(),
                        customPhotoURL: photoURL || null
                    }
                });

                // Create notification for league admins
                if (existingClaimIndex < 0 || claimStatus === 'rejected') {
                    await addDoc(collection(db, "leagues", currentLeagueId, "notifications"), {
                        type: 'player_claim_request',
                        playerName: playerName,
                        claimedBy: user.uid,
                        claimedByName: user.displayName || user.email,
                        claimedByEmail: user.email,
                        height: formattedHeight,
                        weight: weight.trim(),
                        customPhotoURL: photoURL || null,
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        seen: false
                    });
                }

                onClaimSuccess && onClaimSuccess();
                onClose();
            }
        } catch (error) {
            console.error("Error claiming player card:", error);
            alert("Failed to claim player card. Please try again.");
        } finally {
            setIsLoading(false);
            setUploadProgress(0);
        }
    };

    if (!isOpen) return null;

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'text-green-400';
            case 'rejected': return 'text-red-400';
            case 'pending': return 'text-yellow-400';
            default: return 'text-gray-400';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'approved': return 'Approved ✓';
            case 'rejected': return 'Rejected ✗';
            case 'pending': return 'Pending Review ⏳';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4 text-white">
                    {isAlreadyClaimed ? `Update ${playerName}'s Card` : `Claim ${playerName}'s Card`}
                </h2>

                {claimStatus && (
                    <div className={`mb-4 p-3 rounded-lg bg-gray-700 ${getStatusColor(claimStatus)}`}>
                        <div className="text-sm font-medium">
                            Status: {getStatusText(claimStatus)}
                        </div>
                        {claimStatus === 'rejected' && (
                            <div className="text-xs text-gray-300 mt-1">
                                You can update your information and resubmit for review.
                            </div>
                        )}
                    </div>
                )}

                {/* Unit Toggle */}
                <div className="mb-4">
                    <div className="flex items-center justify-center space-x-4 p-2 bg-gray-700 rounded-lg">
                        <button
                            onClick={() => setUseMetric(false)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${!useMetric ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Imperial
                        </button>
                        <button
                            onClick={() => setUseMetric(true)}
                            className={`px-3 py-1 rounded text-sm transition-colors ${useMetric ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                                }`}
                        >
                            Metric
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Height Fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Height
                        </label>
                        {useMetric ? (
                            <StyledInput
                                type="number"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                placeholder="e.g., 188"
                                min="100"
                                max="250"
                            />
                        ) : (
                            <div className="flex space-x-2">
                                <div className="flex-1">
                                    <StyledInput
                                        type="number"
                                        value={heightFeet}
                                        onChange={(e) => setHeightFeet(e.target.value)}
                                        placeholder="Feet"
                                        min="3"
                                        max="8"
                                    />
                                </div>
                                <div className="flex-1">
                                    <StyledInput
                                        type="number"
                                        value={heightInches}
                                        onChange={(e) => setHeightInches(e.target.value)}
                                        placeholder="Inches"
                                        min="0"
                                        max="11"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Weight Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Weight
                        </label>
                        <StyledInput
                            type="text"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder={useMetric ? "e.g., 84 kg" : "e.g., 185 lbs"}
                        />
                    </div>

                    {/* Photo Section - File Upload with Cropping */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Photo (optional)
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoFileChange}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />

                        {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="mt-2">
                                <div className="bg-gray-600 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Uploading... {uploadProgress}%</p>
                            </div>
                        )}

                        {/* Photo Preview */}
                        {photoPreview && (
                            <div className="mt-2 flex justify-center">
                                <img
                                    src={photoPreview}
                                    alt="Preview"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                                    onError={() => setPhotoPreview("")}
                                />
                            </div>
                        )}

                        <p className="text-xs text-gray-400 mt-1">
                            Upload an image file (max 5MB). You can crop it after selection.
                        </p>
                        {showCropModal && (
                            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-75">
                                <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                                    <h3 className="text-lg font-bold mb-4 text-white">
                                        Crop Your Photo
                                    </h3>

                                    <div className="mb-4">
                                        <ReactCrop
                                            crop={crop}
                                            onChange={onCropChange}
                                            onComplete={onCropComplete}
                                            aspect={1} // Square crop
                                            circularCrop={true} // Makes it a circle crop
                                        >
                                            <img
                                                id="crop-image"
                                                src={imageToCrop}
                                                onLoad={onImageLoaded}
                                                style={{ maxWidth: '100%', maxHeight: '400px' }}
                                                alt="Crop preview"
                                            />
                                        </ReactCrop>
                                    </div>

                                    <p className="text-sm text-gray-300 mb-4">
                                        Drag the corners to adjust the crop area. The image will be cropped to a circle for your profile.
                                    </p>

                                    <div className="flex justify-end space-x-3">
                                        <StyledButton
                                            onClick={() => {
                                                setShowCropModal(false);
                                                setImageToCrop(null);
                                            }}
                                        >
                                            Cancel
                                        </StyledButton>
                                        <StyledButton
                                            onClick={handleCropSave}
                                            disabled={!completedCrop}
                                        >
                                            Use Cropped Image
                                        </StyledButton>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <StyledButton onClick={onClose} disabled={isLoading}>
                        Cancel
                    </StyledButton>
                    <StyledButton
                        onClick={handleClaim}
                        disabled={isLoading || (useMetric ? !heightCm && !weight.trim() : !heightFeet && !weight.trim())}
                    >
                        {isLoading ? "Saving..." : (isAlreadyClaimed ? "Update Card" : "Submit for Review")}
                    </StyledButton>
                </div>
            </div>
        </div>
    );
}
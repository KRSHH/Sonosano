import os
import librosa
import numpy as np
from scipy import signal
from tinytag import TinyTag

def analyze_audio_final(file_path):
    """
    Analyzes an audio file to determine if it is a genuine lossless file or a
    lossy transcode. Returns a simple string verdict.
    """
    if not os.path.exists(file_path):
        return "Error"

    try:
        # 1. --- File Integrity and Basic Info ---
        y, sr = librosa.load(file_path, sr=None, mono=False)
        actual_duration = librosa.get_duration(y=y, sr=sr)
        metadata = TinyTag.get(file_path)
        declared_duration = metadata.duration

        if declared_duration and abs(actual_duration - declared_duration) > 2.0:
            return "Corrupted"

        # 2. --- Frequency Cutoff Detection ---
        is_stereo = y.ndim >= 2 and y.shape[0] >= 2
        y_mono = y[0] if is_stereo else y
        
        S = librosa.feature.melspectrogram(y=y_mono, sr=sr, n_mels=256, fmax=sr/2)
        S_dB = librosa.power_to_db(S, ref=np.max)
        max_freq_energy = np.max(S_dB, axis=1)
        threshold_db = np.max(max_freq_energy) - 60
        significant_bins = np.where(max_freq_energy > threshold_db)[0]
        
        if len(significant_bins) == 0:
            return "Undetermined" # Or handle as an error/specific case

        highest_freq_bin = significant_bins[-1]
        mel_freqs = librosa.mel_frequencies(n_mels=256, fmax=sr/2)
        cutoff_freq = mel_freqs[highest_freq_bin]

        # 3. --- High-Frequency Stereo Analysis ---
        stereo_correlation = None
        if is_stereo and sr >= 44100 and cutoff_freq > 16000:
            b, a = signal.butter(4, 16000 / (sr / 2), btype='high')
            left_hf = signal.filtfilt(b, a, y[0])
            right_hf = signal.filtfilt(b, a, y[1])
            correlation_matrix = np.corrcoef(left_hf, right_hf)
            stereo_correlation = correlation_matrix[0, 1]

        # 4. --- Final Verdict Logic ---
        if cutoff_freq > 21000:
            return "Real"
        elif cutoff_freq > 19800:
            if is_stereo and stereo_correlation is not None and stereo_correlation < 0.95:
                return "Real"
            else:
                return "Fake"
        else:
            return "Fake"

    except Exception:
        return "Error"
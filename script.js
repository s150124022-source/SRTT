document.addEventListener('DOMContentLoaded', function() {

    // --- KONFIGURASI SRTT ---
    const SEQUENCE = [0, 2, 1, 3, 0, 1, 2, 3, 1, 0]; // Pola 10-trial
    const KEY_MAP = { 'v': 0, 'b': 1, 'n': 2, 'm': 3 }; 
    const TRIALS_PER_STAGE = 80; // 80 trial per stage
    const TOTAL_STAGES = 9; // Total 9 stage (Stage 1-8 = Berulang, Stage 9 = Acak)
    const TIMEOUT_MS = 2000; // Waktu reaksi maksimum 2000 ms (2 detik)
    const BREAK_DURATION_SEC = 30; 
    const PAUSE_AFTER_ERROR_MS = 500; // Jeda setelah salah atau timeout
    const PAUSE_AFTER_CORRECT_MS = 50; // Jeda setelah respons benar

    // Elemen DOM
    const BOXES = document.querySelectorAll('.box');
    const MESSAGE_ELEMENT = document.getElementById('message');
    const RESULTS_ELEMENT = document.getElementById('results');
    const DEFAULT_MESSAGE = 'Tekan tombol [V] & [B] dengan **Tangan Kiri**, dan [N] & [M] dengan **Tangan Kanan**. Tekan Spasi untuk Mulai.';

    // --- VARIABEL STATE & SEQUENCE ACAR ---
    let currentStage = 1;
    let trialCount = 0;
    let sequenceIndex = 0; 
    let currentStimulus = -1;
    let startTime = 0;
    let isRunning = false;
    let timeoutId = null;
    let countdownIntervalId = null;
    
    let resultsData = []; 
    let RANDOM_SEQUENCE = []; 

    // --- FUNGSI PEMBUAT URUTAN ACAK ---
    function generateRandomSequence(length, maxIndex) {
        const seq = [];
        for (let i = 0; i < length; i++) {
            seq.push(Math.floor(Math.random() * maxIndex)); 
        }
        return seq;
    }

    // --- FUNGSI UTAMA ---

    function startSRTT() {
        if (isRunning) return;
        isRunning = true;
        
        currentStage = 1;
        trialCount = 0;
        sequenceIndex = 0;
        resultsData = []; 
        
        // INISIALISASI URUTAN ACAK UNTUK STAGE TERAKHIR
        RANDOM_SEQUENCE = generateRandomSequence(TRIALS_PER_STAGE, BOXES.length); 

        // Inisialisasi data untuk Stage 1
        resultsData.push({ stage: 1, rts: [], errors: 0 }); 
        
        RESULTS_ELEMENT.innerHTML = '';
        // Pesan awal yang bersih tanpa deskripsi pola
        MESSAGE_ELEMENT.textContent = 'STAGE 1 DIMULAI. Siap!'; 
        setTimeout(nextTrial, 1000); 
    }

    function handleTimeout() {
        if (!isRunning || currentStimulus === -1) return;

        // Pemeriksaan array untuk mencegah error jika dataStage belum terbuat
        if (currentStage > resultsData.length || currentStage < 1) {
             console.error(`Status Stage tidak valid: ${currentStage}`);
             return;
        }
        const currentStageData = resultsData[currentStage - 1];

        if (timeoutId) clearTimeout(timeoutId); // Pastikan timeout sebelumnya dibersihkan
        
        currentStageData.rts.push(TIMEOUT_MS);
        currentStageData.errors++;
        
        MESSAGE_ELEMENT.textContent = 'TERLALU LAMA!';
        MESSAGE_ELEMENT.classList.add('error');

        BOXES[currentStimulus].classList.remove('active');
        currentStimulus = -1;
        
        setTimeout(nextTrial, PAUSE_AFTER_ERROR_MS); 
    }

    function startBreak() {
        isRunning = false;
        BOXES.forEach(box => box.classList.remove('active'));
        
        if (currentStage >= TOTAL_STAGES) {
             endSRTT();
             return;
        }

        let timeLeft = BREAK_DURATION_SEC;
        MESSAGE_ELEMENT.classList.remove('error');
        
        let nextStageMessage = `STAGE ${currentStage + 1} AKAN DIMULAI.`;
        if (currentStage + 1 === TOTAL_STAGES) {
            // Peringatan untuk tes akhir, tanpa kata "pola"
            nextStageMessage = 'PERHATIAN: STAGE BERIKUTNYA ADALAH TES AKHIR.';
        }


        const updateCountdown = () => {
            if (timeLeft <= 0) {
                clearInterval(countdownIntervalId);
                startNextStage();
            } else {
                MESSAGE_ELEMENT.textContent = `JEDA: ${timeLeft} DETIK TERSISA. ${nextStageMessage}`;
                timeLeft--;
            }
        };

        updateCountdown(); 
        countdownIntervalId = setInterval(updateCountdown, 1000);
    }

    function startNextStage() {
        currentStage++;
        isRunning = true;
        trialCount = 0; 
        sequenceIndex = 0; 
        
        // Inisialisasi data untuk Stage baru
        resultsData.push({ stage: currentStage, rts: [], errors: 0 }); 
        
        MESSAGE_ELEMENT.textContent = `STAGE ${currentStage} DIMULAI. Siap!`; 
        setTimeout(nextTrial, 1000); 
    }


    function nextTrial() {
        if (trialCount >= TRIALS_PER_STAGE) {
            startBreak();
            return;
        }

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        MESSAGE_ELEMENT.textContent = `STAGE ${currentStage}`;
        MESSAGE_ELEMENT.classList.remove('error');
        
        let targetIndex;
        
        // Stage 1 hingga 8 (TOTAL_STAGES - 1) menggunakan SEQUENCE
        if (currentStage < TOTAL_STAGES) { 
            targetIndex = SEQUENCE[sequenceIndex]; 
            sequenceIndex = (sequenceIndex + 1) % SEQUENCE.length;
        } else {
            // Stage 9 (TOTAL_STAGES) menggunakan RANDOM_SEQUENCE
            targetIndex = RANDOM_SEQUENCE[trialCount]; 
        }
        
        currentStimulus = targetIndex; 
        
        BOXES[currentStimulus].classList.add('active');
        
        startTime = performance.now();
        
        timeoutId = setTimeout(handleTimeout, TIMEOUT_MS);
        
        trialCount++; // Increment trial counter
    }

    function endSRTT() {
        isRunning = false;
        if (timeoutId) clearTimeout(timeoutId);
        if (countdownIntervalId) clearInterval(countdownIntervalId);

        MESSAGE_ELEMENT.textContent = 'TES SELESAI TOTAL!';
        
        const calculateResults = (rts, errors) => {
            const validRTs = rts.filter(rt => rt < TIMEOUT_MS); 
            const totalRT = validRTs.reduce((a, b) => a + b, 0);
            const avgRT = validRTs.length > 0 ? totalRT / validRTs.length : 0; 
            
            const totalRecordedTrials = rts.length; 
            return { avgRT, errors, totalRecordedTrials };
        };

        let resultsHTML = `<h3>HASIL AKHIR (${TOTAL_STAGES} STAGE)</h3>`;


        resultsData.forEach(data => {
            const result = calculateResults(data.rts, data.errors);
            
            // Label yang informatif untuk laporan hasil tanpa menyebutkan pola yang dilarang
            const stageLabel = (data.stage < TOTAL_STAGES) 
                ? `Stage ${data.stage} (Latihan)` // Stage 1-8
                : `Stage ${data.stage} (Tes Akhir)`; // Stage 9
            
            resultsHTML += `
                <h4>${stageLabel}</h4>
                Waktu Reaksi Rata-Rata: **${result.avgRT.toFixed(2)} ms**<br>
                Total Kesalahan (Respon Salah & Timeout): **${result.errors} kali**<br>
                Total Percobaan Selesai: **${result.totalRecordedTrials}** (Target: ${TRIALS_PER_STAGE})
                <hr style="margin: 5px 0;">
            `;
        });
        
        RESULTS_ELEMENT.innerHTML = resultsHTML;
        
        BOXES.forEach(box => box.classList.remove('active'));
    }

    // --- FUNGSI RESPON KEYBOARD ---

    document.addEventListener('keydown', function(event) {
        const key = event.key.toLowerCase();
        
        // Cek inisiasi pertama
        if (key === ' ' && !isRunning && currentStage === 1 && trialCount === 0) {
            startSRTT();
            return;
        }

        if (!isRunning || currentStimulus === -1) return;

        const responseIndex = KEY_MAP[key];

        if (responseIndex !== undefined) {
            
            // Pemeriksaan array untuk mencegah error
            if (currentStage > resultsData.length || currentStage < 1) {
                 console.error(`Status Stage tidak valid: ${currentStage}`);
                 return;
            }
            const currentStageData = resultsData[currentStage - 1];
            
            if (responseIndex === currentStimulus) {
                
                // --- RESPON BENAR ---
                if (timeoutId) clearTimeout(timeoutId);
                
                const endTime = performance.now();
                const reactionTime = endTime - startTime;
                
                currentStageData.rts.push(reactionTime);
                
                BOXES[currentStimulus].classList.remove('active');
                currentStimulus = -1;
                
                setTimeout(nextTrial, PAUSE_AFTER_CORRECT_MS); 
                
            } else {
                // --- RESPON SALAH ---
                
                if (timeoutId) clearTimeout(timeoutId);
                
                currentStageData.errors++;
                
                MESSAGE_ELEMENT.textContent = 'SALAH!';
                MESSAGE_ELEMENT.classList.add('error');

                BOXES[currentStimulus].classList.remove('active');
                currentStimulus = -1;
                
                // Mencatat kesalahan sebagai RT maksimum
                currentStageData.rts.push(TIMEOUT_MS); 

                setTimeout(nextTrial, PAUSE_AFTER_ERROR_MS);
                
            }
        }
    });

    // Set pesan awal saat DOMContentLoaded selesai
    MESSAGE_ELEMENT.textContent = DEFAULT_MESSAGE;
});
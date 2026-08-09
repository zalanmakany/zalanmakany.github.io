/* UI Overlay - Hidden entirely */
#ui-overlay {
    display: none; 
}

/* Scroll indicator - Pinned to the side */
.scroll-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: absolute; 
    bottom: 50%;        
    right: 3rem;        
}

.scroll-indicator span {
    width: 14px;
    height: 14px;
    background: #00FF66;
    border-radius: 50%;
    opacity: 0.3;
    animation: bounce 1.5s infinite;
}

.scroll-indicator span:nth-child(2) { animation-delay: 0.2s; }
.scroll-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
    0%, 100% { transform: translateY(0); opacity: 0.3; }
    50%      { transform: translateY(12px); opacity: 1; }
}

/* ============================================
   ATTRIBUTION OVERLAY
   ============================================ */
.model-credit {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    font-family: 'IBM Plex Mono', monospace; 
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.5); 
    z-index: 50; 
    pointer-events: auto; 
}

.model-credit a {
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    border-bottom: 1px dotted rgba(255, 255, 255, 0.4);
    transition: color 0.2s ease, border-color 0.2s ease;
}

.model-credit a:hover {
    color: #00FF66; 
    border-bottom-color: #00FF66;
}

/* Responsive Overrides for Mobile */
@media (max-width: 768px) {
    .scroll-indicator {
        right: 1rem;
        bottom: 40%;
    }
    
    .scroll-indicator span {
        width: 8px;
        height: 8px;
    }
}

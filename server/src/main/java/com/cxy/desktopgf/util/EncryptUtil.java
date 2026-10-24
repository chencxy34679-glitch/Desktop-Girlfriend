package com.cxy.desktopgf.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM 对称加密工具类(预留)。
 * <p>
 * 主要用途:
 * <ul>
 *     <li>OAuth 第三方回调 token 的加密存储</li>
 *     <li>敏感字段(身份证、手机号)的脱敏落库</li>
 *     <li>对外暴露的可逆编码需求</li>
 * </ul>
 * </p>
 * <p>
 * 密钥来源:环境变量 {@code DGF_ENCRYPT_KEY},必须为 32 字节 hex 字符串(64 个十六进制字符)。
 * 每次启动会校验密钥格式,缺失或非法长度会直接抛出异常以阻止应用启动。
 * </p>
 * <p>
 * 密文格式(Base64):<br>
 * {@code [12B IV][16B TAG][N 密文]} — IV 每次 {@link SecureRandom} 生成,GCM tag 拼接在密文前。
 * </p>
 *
 * @author 陈相宇
 */
@Slf4j
@Component
public class EncryptUtil {

    /**
     * GCM IV 长度(字节)。NIST 建议 12 字节(96 bit)。
     */
    private static final int GCM_IV_LENGTH = 12;

    /**
     * GCM tag 长度(比特)。Java 标准允许 128 / 120 / 112 / 104 / 96。
     */
    private static final int GCM_TAG_BITS = 128;

    /**
     * AES 算法固定字符串。
     */
    private static final String AES_GCM_TRANSFORMATION = "AES/GCM/NoPadding";

    /**
     * 32 字节 AES-256 密钥。
     */
    private byte[] keyBytes;

    /**
     * 启动时尝试加载密钥。
     * <p>
     * 未配置 {@code DGF_ENCRYPT_KEY} 时只打 warn 不抛异常 —— 本工具当前是预留能力,
     * 不应在开发期阻塞整个应用启动;真正调用 {@link #encrypt(String)} 时才会因
     * {@code keyBytes == null} 抛错,提示补齐配置。
     * </p>
     */
    @PostConstruct
    public void init() {
        String hex = System.getenv("DGF_ENCRYPT_KEY");
        if (hex == null || hex.isBlank()) {
            log.warn("环境变量 DGF_ENCRYPT_KEY 未配置,EncryptUtil 处于未初始化状态(当前无业务依赖,不影响启动)");
            return;
        }
        if (hex.length() != 64) {
            log.warn("DGF_ENCRYPT_KEY 必须是 64 个十六进制字符(32 字节),当前长度={},EncryptUtil 未初始化", hex.length());
            return;
        }
        try {
            byte[] decoded = hexToBytes(hex);
            if (decoded.length != 32) {
                log.warn("DGF_ENCRYPT_KEY 解码后必须为 32 字节,实际={},EncryptUtil 未初始化", decoded.length);
                return;
            }
            this.keyBytes = decoded;
        } catch (IllegalArgumentException ex) {
            log.warn("DGF_ENCRYPT_KEY 不是合法的 hex 字符串,EncryptUtil 未初始化", ex);
            return;
        }
        log.info("EncryptUtil 初始化完成(AES-256-GCM)");
    }

    /**
     * 懒加载密钥,供 encrypt / decrypt 在未走 {@link #init()} 时兜底。
     *
     * @return 32 字节密钥
     * @throws IllegalStateException 密钥未配置或不合法
     */
    private byte[] requireKey() {
        if (keyBytes == null) {
            throw new IllegalStateException(
                    "DGF_ENCRYPT_KEY 未配置或非法,请生成 32 字节 hex 密钥后注入环境变量");
        }
        return keyBytes;
    }

    /**
     * 加密任意字符串。
     *
     * @param plaintext 明文
     * @return Base64(IV || TAG || ciphertext);当 plaintext 为 {@code null} 时返回 {@code null}
     */
    public String encrypt(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(requireKey(), "AES"),
                    new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] cipherBytes = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            byte[] ivAndCipher = new byte[GCM_IV_LENGTH + cipherBytes.length];
            System.arraycopy(iv, 0, ivAndCipher, 0, GCM_IV_LENGTH);
            System.arraycopy(cipherBytes, 0, ivAndCipher, GCM_IV_LENGTH, cipherBytes.length);
            return Base64.getEncoder().encodeToString(ivAndCipher);
        } catch (Exception ex) {
            throw new IllegalStateException("EncryptUtil.encrypt 失败", ex);
        }
    }

    /**
     * 解密由 {@link #encrypt(String)} 生成的 Base64 字符串。
     *
     * @param ciphertext Base64 密文
     * @return 明文;当 ciphertext 为 {@code null} 时返回 {@code null}
     */
    public String decrypt(String ciphertext) {
        if (ciphertext == null) {
            return null;
        }
        try {
            byte[] ivAndCipher = Base64.getDecoder().decode(ciphertext);
            if (ivAndCipher.length < GCM_IV_LENGTH + (GCM_TAG_BITS / 8)) {
                throw new IllegalArgumentException("密文长度异常,少于最小 IV+TAG");
            }
            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(ivAndCipher, 0, iv, 0, GCM_IV_LENGTH);
            Cipher cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(requireKey(), "AES"),
                    new GCMParameterSpec(GCM_TAG_BITS, iv));
            byte[] plainBytes = cipher.doFinal(ivAndCipher, GCM_IV_LENGTH,
                    ivAndCipher.length - GCM_IV_LENGTH);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("EncryptUtil.decrypt 失败", ex);
        }
    }

    /**
     * 将 64 长度 hex 字符串解码为 32 字节。
     */
    private byte[] hexToBytes(String hex) {
        int len = hex.length();
        if ((len & 1) != 0) {
            throw new IllegalArgumentException("hex 字符串长度必须为偶数");
        }
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            int hi = Character.digit(hex.charAt(i), 16);
            int lo = Character.digit(hex.charAt(i + 1), 16);
            if (hi < 0 || lo < 0) {
                throw new IllegalArgumentException("包含非 hex 字符");
            }
            data[i / 2] = (byte) ((hi << 4) + lo);
        }
        return data;
    }
}

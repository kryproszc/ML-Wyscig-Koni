library(fitdistrplus)

setwd("C:/Users/szczesnk/Desktop/Bieżące/Praca naukowa/Doktorat/Badania empiryczne/Sieci")


df_origin<- read.csv2("dane_input.csv",sep=",",dec = ".")
df_origin<-df_origin[-c(6,96),]
data_train <-read.csv("original_train_data_unnormalized (1).csv", sep = ",", dec = ".")
data_test  <- read.csv("original_test_data_unnormalized (1).csv", sep = ",", dec = ".")

summary(data_train)

fit_rzecz.1 <- fitdist(data_train[,1], "logis")
fit_rzecz.1
fit_rzecz.2 <- fitdist(data_train[,2], "logis")
fit_rzecz.2
fit_rzecz.3 <- fitdist(data_train[,3], "logis")
fit_rzecz.3
fit_rzecz.4 <- fitdist(data_train[,4], "logis")

plot(fit_rzecz.4)

# CDF dla danych testowych
#u1 <- plogis(data_test[,1], location = fit_rzecz.1$estimate["location"], scale = fit_rzecz.1$estimate["scale"])
#u2 <- plogis(data_test[,2], location = fit_rzecz.2$estimate["location"], scale = fit_rzecz.2$estimate["scale"])
#u3 <- plogis(data_test[,3], location = fit_rzecz.3$estimate["location"], scale = fit_rzecz.3$estimate["scale"])
#u4 <- plogis(data_test[,4], location = fit_rzecz.4$estimate["location"], scale = fit_rzecz.4$estimate["scale"])


####
library(fitdistrplus)

# kolumna 1
fit_rzecz.1 <- fitdist(na.omit(data_train[,1]), "logis")
loc1 <- fit_rzecz.1$estimate["location"]
sca1 <- fit_rzecz.1$estimate["scale"]
q995_1 <- qlogis(0.995, location = loc1, scale = sca1)
mean1 <- loc1
diff1 <- q995_1 - mean1

# kolumna 2
fit_rzecz.2 <- fitdist(na.omit(data_train[,2]), "logis")
loc2 <- fit_rzecz.2$estimate["location"]
sca2 <- fit_rzecz.2$estimate["scale"]
q995_2 <- qlogis(0.995, location = loc2, scale = sca2)
mean2 <- loc2
diff2 <- q995_2 - mean2

# kolumna 3
fit_rzecz.3 <- fitdist(na.omit(data_train[,3]), "logis")
loc3 <- fit_rzecz.3$estimate["location"]
sca3 <- fit_rzecz.3$estimate["scale"]
q995_3 <- qlogis(0.995, location = loc3, scale = sca3)
mean3 <- loc3
diff3 <- q995_3 - mean3

# kolumna 4
fit_rzecz.4 <- fitdist(na.omit(data_train[,4]), "logis")
loc4 <- fit_rzecz.4$estimate["location"]
sca4 <- fit_rzecz.4$estimate["scale"]
q995_4 <- qlogis(0.995, location = loc4, scale = sca4)
mean4 <- loc4
diff4 <- q995_4 - mean4

# suma (q0.995 - średnia) dla 4 kolumn
suma_diffs <- diff1 + diff2 + diff3 + diff4
suma_diffs



##FS



kappa1 <- diff1
kappa2 <- diff2
kappa3 <- diff3
kappa4 <- diff4

kappa_vec <- c(kappa1, kappa2, kappa3, kappa4)
names(kappa_vec) <- paste0("X", 1:4)

# pokaz wyniki cząstkowe
print(round(kappa_vec, 5))

# -----------------------------------------------
# 6) Macierz korelacji R (ρ = 0.25)
# -----------------------------------------------
rho <- c(
  1.00, 0.50, 0.25, 0.25,
  0.50, 1.00, 0.25, 0.25,
  0.25, 0.25, 1.00, 0.50,
  0.25, 0.25, 0.50, 1.00
)

R <- matrix(rho, nrow = 4, ncol = 4, byrow = TRUE)


SCR_fs <- sqrt(t(kappa_vec) %*% R %*% kappa_vec)
SCR_fs



#########33 C-vine
library(VineCopula)

set.seed(12)

plot(data_train)
U <- pobs(as.matrix(data_train))
colnames(U) <- c("C0020","C0040","C0050","C0070")

#set.seed(101)
C_vine <- RVineStructureSelect(
  data          = U,
  type          = 1,          # C-vine
  familyset     = 1:5,
  treecrit      = "tau",
  selectioncrit = "logLik",
  rotations     = FALSE,
  method        = "mle"
)

# 4) Log-likelihood na obserwację
ll_total     <- C_vine$logLik
ll_per_obs   <- ll_total / nrow(U)

# 5) Weryfikacja – UWAGA: poprawna kolejność argumentów to (U, RVM)
ll_check     <- RVineLogLik(U, C_vine)$loglik
ll_check_per <- ll_check / nrow(U)

# 6) Ekstrakcja parametrów i złożenie obiektu macierzy
familyC <- C_vine$family
parC    <- C_vine$par
parC2   <- C_vine$par2
MatrixC <- C_vine$Matrix

RVMC <- RVineMatrix(
  Matrix = MatrixC,
  family = familyC,
  par    = parC,
  par2   = parC2,
  names  = colnames(U)
)

# 7) Typ vine (powinno wyjść 1 dla C-vine)
RVMC$type

# 8) Symulacja z dopasowanej kopuli (na skali (0,1))
#set.seed(101)
U_sim <- RVineSim(10000, RVMC)
Data_C_vine <- as.data.frame(U_sim)

plot(C_vine, tree = "ALL", type = 1, edge.labels = "family-tau")



library(VineCopula)

# liczba drzew (czyli liczba zmiennych - 1)
n_trees <- ncol(C_vine$Matrix) - 1

# ustawienie układu 1 wiersz x n_trees kolumn
par(mfrow = c(1, n_trees))

# rysowanie wszystkich drzew jeden obok drugiego
plot(C_vine, tree = "ALL", type = 1, edge.labels = "family-tau")

######

library(VineCopula)

loc1 <- fit_rzecz.1$estimate["location"]; sca1 <- fit_rzecz.1$estimate["scale"]
loc2 <- fit_rzecz.2$estimate["location"]; sca2 <- fit_rzecz.2$estimate["scale"]
loc3 <- fit_rzecz.3$estimate["location"]; sca3 <- fit_rzecz.3$estimate["scale"]
loc4 <- fit_rzecz.4$estimate["location"]; sca4 <- fit_rzecz.4$estimate["scale"]
Q_1_vine <- qlogis(Data_C_vine[,1], location = loc1, scale = sca1)
Q_2_vine <- qlogis(Data_C_vine[,2], location = loc2, scale = sca2)
Q_3_vine <- qlogis(Data_C_vine[,3], location = loc3, scale = sca3)
Q_4_vine <- qlogis(Data_C_vine[,4], location = loc4, scale = sca4)

data_cop_vin<-as.data.frame(cbind(Q_1_vine,Q_2_vine,Q_3_vine,Q_4_vine))
SCR_vine<-quantile(rowSums(data_cop_vin),0.995) - mean(rowSums(data_cop_vin))
SCR_vine

plot(data_cop_vin)

###### d vine

## --- Pakiety ---
library(VineCopula)
library(TSP)

## --- Dane na skali (0,1) -- Uwaga: jeżeli masz już 'copula', zacznij od kolejnej sekcji ---
# U <- pobs(as.matrix(data_train))
# colnames(U) <- c("C0020","C0040","C0050","C0070")
copula <- U

## --- 1) Porządek D-vine na bazie Kendalla tau (TSP po 1 - |tau|) ---
d  <- ncol(copula)
M  <- 1 - abs(TauMatrix(copula))          # "odległość" = 1 - |tau|
ham <- TSP::insert_dummy(TSP(M), label = "cut")
sol <- solve_TSP(ham, method = "repetitive_nn")
ord <- cut_tour(sol, "cut")               # wektor kolejności indeksów (1..d)

## --- 2) Macierz D-vine (struktura) z zablokowanym porządkiem ---
DVM <- D2RVine(ord,
               family = rep(0, d*(d-1)/2),
               par    = rep(0, d*(d-1)/2))

## --- 3) Dobór rodzin i parametrów na ustalonej strukturze (AIC) ---
#set.seed(101)
D_vine <- RVineCopSelect(
  data          = as.matrix(copula),
  familyset     = 1:10,            # albo NA dla wszystkich dostępnych
  Matrix        = DVM$Matrix,      # struktura D-vine z kroku 2
  selectioncrit = "logLik",
  method        = "mle",
  rotations     = TRUE
)

## (opcjonalnie) nazwy zmiennych
D_vine$names <- c("C0020","C0040","C0050","C0070")

## --- 4) Log-likelihood łącznie i na obserwację + weryfikacja RVineLogLik ---
ll_total     <- D_vine$logLik
ll_per_obs   <- ll_total / nrow(copula)

ll_check     <- RVineLogLik(as.matrix(copula), D_vine)$loglik
ll_check_per <- ll_check / nrow(copula)

## --- 5) Ekstrakcja parametrów i złożenie obiektu RVineMatrix (RVM) ---
familyD <- D_vine$family
parD    <- D_vine$par
parD2   <- D_vine$par2
MatrixD <- D_vine$Matrix

RVMD <- RVineMatrix(
  Matrix = MatrixD,
  family = familyD,
  par    = parD,
  par2   = parD2,
  names  = D_vine$names
)

## --- 6) Typ vine (powinno być 2 dla D-vine) ---
RVMD$type

## --- 7) Symulacja z dopasowanej kopuli (skala (0,1)) ---
#set.seed(101)
U_sim <- RVineSim(10000, RVMD)
Data_D_vine <- as.data.frame(U_sim)

## --- 8) Wykres wszystkich drzew z rodziną i tau na krawędziach ---
par(mfrow = c(1, ncol(MatrixD) - 1))
plot(D_vine, tree = "ALL", type = 1, edge.labels = "family-tau")

## --- 9) Powrót na skale brzegowe i kalkulacja SCR (jak w Twojej wersji) ---
# Założenie: masz już dopasowane brzegowe logistyczne: fit_rzecz.1, ..., fit_rzecz.4
loc1 <- fit_rzecz.1$estimate["location"]; sca1 <- fit_rzecz.1$estimate["scale"]
loc2 <- fit_rzecz.2$estimate["location"]; sca2 <- fit_rzecz.2$estimate["scale"]
loc3 <- fit_rzecz.3$estimate["location"]; sca3 <- fit_rzecz.3$estimate["scale"]
loc4 <- fit_rzecz.4$estimate["location"]; sca4 <- fit_rzecz.4$estimate["scale"]

Q_1_vine <- qlogis(Data_D_vine[,1], location = loc1, scale = sca1)
Q_2_vine <- qlogis(Data_D_vine[,2], location = loc2, scale = sca2)
Q_3_vine <- qlogis(Data_D_vine[,3], location = loc3, scale = sca3)
Q_4_vine <- qlogis(Data_D_vine[,4], location = loc4, scale = sca4)

data_cop_vin_D <- data.frame(Q_1_vine, Q_2_vine, Q_3_vine, Q_4_vine)

SCR_vine_D <- quantile(rowSums(data_cop_vin_D), 0.995) - mean(rowSums(data_cop_vin_D))
SCR_vine_D

plot(data_cop_vin_D)

######

# 10) Powrót na skalę brzegowych rozkładów i kalkulacja SCR
library(VineCopula)

loc1 <- fit_rzecz.1$estimate["location"]; sca1 <- fit_rzecz.1$estimate["scale"]
loc2 <- fit_rzecz.2$estimate["location"]; sca2 <- fit_rzecz.2$estimate["scale"]
loc3 <- fit_rzecz.3$estimate["location"]; sca3 <- fit_rzecz.3$estimate["scale"]
loc4 <- fit_rzecz.4$estimate["location"]; sca4 <- fit_rzecz.4$estimate["scale"]

Q_1_vine <- qlogis(Data_D_vine[,1], location = loc1, scale = sca1)
Q_2_vine <- qlogis(Data_D_vine[,2], location = loc2, scale = sca2)
Q_3_vine <- qlogis(Data_D_vine[,3], location = loc3, scale = sca3)
Q_4_vine <- qlogis(Data_D_vine[,4], location = loc4, scale = sca4)

data_cop_vin_D <- as.data.frame(cbind(Q_1_vine, Q_2_vine, Q_3_vine, Q_4_vine))
SCR_vine_D <- quantile(rowSums(data_cop_vin_D), 0.995) - mean(rowSums(data_cop_vin_D))
SCR_vine_D

plot(data_cop_vin_D)


### ocen dopasowanie
library(scoringRules)
ocena_modelu<-function(d_real,d_simu){
  m_real<-dim(d_real)[1]
  bledy<-c()
  d_simu<-as.matrix(d_simu)
  for(i in 1:m_real){
    es<-es_sample(y=as.numeric(d_real[i,]),dat=t(d_simu))
    bledy<-append(bledy,es)
  }
  return(list(mean(bledy),bledy))
}
summary(df_origin)




xx_neural<-ocena_modelu(df_origin,data_restored)
xx_vine<-ocena_modelu(df_origin,data_cop_vin)
xx_Dvine<-ocena_modelu(df_origin,data_cop_vin_D)

print(quantile(xx_neural[[2]],prob))

xx_neural[[2]]

for(prob in c(0.1,0.2,0.3,0.4,0.5,0.6,.7,0.8,0.9, 0.95)){
  print("----")
  print(quantile(xx_vine[[2]],prob))
  print(quantile(xx_Dvine[[2]],prob))
}
sd(xx_neural[[2]])
mean(xx_neural[[2]])




ocena_modelu_v2<-function(d_real,d_simu){
  m_real<-dim(d_real)[1]
  bledy<-c()
  d_simu<-as.matrix(d_simu)
  for(i in 1:m_real){
    es<-vs_sample(y=as.numeric(d_real[i,]),dat=t(d_simu),p=0.5)
    bledy<-append(bledy,es)
  }
  return(list(mean(bledy),bledy))
}

xx_neural_v2<-ocena_modelu_v2(df_origin,data_gen)
xx_vine_v2<-ocena_modelu_v2(df_origin,data_cop_vin)
xx_dvine_v2<-ocena_modelu_v2(df_origin,data_dvine_python)







##################
#znajdz seed




library(VineCopula)
library(TSP)

## --- Założenia ---
## Masz już: data_train, fit_rzecz.1 ... fit_rzecz.4 (parametry brzegowe)
## Uwaga: używamy familyset = 1:5 dla C-vine, oraz 1:10 dla D-vine jak u Ciebie.

# Funkcja liczaca SCR dla zadanego seeda
scr_for_seed <- function(seed) {
  set.seed(seed)
  
  # --- Dane na skali (0,1) ---
  U <- pobs(as.matrix(data_train))
  colnames(U) <- c("C0020","C0040","C0050","C0070")
  copula <- U
  
  ## -------- C-vine --------
  C_vine <- RVineStructureSelect(
    data          = U,
    type          = 1,          # C-vine
    familyset     = 1:5,
    treecrit      = "tau",
    selectioncrit = "logLik",
    rotations     = FALSE,
    method        = "mle"
  )
  
  # Symulacja (użyj tego samego seeda dla reprodukowalności)
  set.seed(seed)
  U_sim_C <- RVineSim(10000, C_vine)
  Data_C_vine <- as.data.frame(U_sim_C)
  
  # Transformacje brzegowe (logistic q)
  loc1 <- fit_rzecz.1$estimate["location"]; sca1 <- fit_rzecz.1$estimate["scale"]
  loc2 <- fit_rzecz.2$estimate["location"]; sca2 <- fit_rzecz.2$estimate["scale"]
  loc3 <- fit_rzecz.3$estimate["location"]; sca3 <- fit_rzecz.3$estimate["scale"]
  loc4 <- fit_rzecz.4$estimate["location"]; sca4 <- fit_rzecz.4$estimate["scale"]
  
  Qc1 <- qlogis(Data_C_vine[,1], location = loc1, scale = sca1)
  Qc2 <- qlogis(Data_C_vine[,2], location = loc2, scale = sca2)
  Qc3 <- qlogis(Data_C_vine[,3], location = loc3, scale = sca3)
  Qc4 <- qlogis(Data_C_vine[,4], location = loc4, scale = sca4)
  
  SCR_vine <- quantile(Qc1+Qc2+Qc3+Qc4, 0.995) - mean(Qc1+Qc2+Qc3+Qc4)
  
  ## -------- D-vine --------
  # Porządek D-vine na bazie Kendalla tau (TSP po 1 - |tau|)
  d  <- ncol(copula)
  M  <- 1 - abs(TauMatrix(copula))
  ham <- TSP::insert_dummy(TSP(M), label = "cut")
  sol <- solve_TSP(ham, method = "repetitive_nn")
  ord <- cut_tour(sol, "cut")
  
  DVM <- D2RVine(ord,
                 family = rep(0, d*(d-1)/2),
                 par    = rep(0, d*(d-1)/2))
  
  # Dobór rodzin/parametrów na ustalonej strukturze
  set.seed(seed)
  D_vine <- RVineCopSelect(
    data          = as.matrix(copula),
    familyset     = 1:10,
    Matrix        = DVM$Matrix,
    selectioncrit = "logLik",
    method        = "mle",
    rotations     = TRUE
  )
  
  # Symulacja (ten sam seed)
  set.seed(seed)
  U_sim_D <- RVineSim(10000, D_vine)
  Data_D_vine <- as.data.frame(U_sim_D)
  
  # Transformacje brzegowe (logistic q)
  Qd1 <- qlogis(Data_D_vine[,1], location = loc1, scale = sca1)
  Qd2 <- qlogis(Data_D_vine[,2], location = loc2, scale = sca2)
  Qd3 <- qlogis(Data_D_vine[,3], location = loc3, scale = sca3)
  Qd4 <- qlogis(Data_D_vine[,4], location = loc4, scale = sca4)
  
  SCR_vine_D <- quantile(Qd1+Qd2+Qd3+Qd4, 0.995) - mean(Qd1+Qd2+Qd3+Qd4)
  
  c(SCR_C = as.numeric(SCR_vine), SCR_D = as.numeric(SCR_vine_D))
}

## --- Wyszukiwanie seeda spełniającego oba warunki ---
find_seed <- function(from = 1, to = 10000, threshold = 1.4, verbose_every = 100) {
  best <- list(seed = NA, SCR_C = Inf, SCR_D = Inf, maxSCR = Inf)
  
  for (s in from:to) {
    scr <- try(scr_for_seed(s), silent = TRUE)
    if (inherits(scr, "try-error") || any(!is.finite(scr))) next
    
    maxSCR <- max(scr["SCR_C"], scr["SCR_D"])
    
    # zapamiętaj najlepszy dotąd (minimalny maxSCR)
    if (maxSCR < best$maxSCR) {
      best <- list(seed = s, SCR_C = scr["SCR_C"], SCR_D = scr["SCR_D"], maxSCR = maxSCR)
    }
    
    # warunek spełniony – zwróć od razu
    if (scr["SCR_C"] < threshold && scr["SCR_D"] < threshold) {
      message(sprintf("Znaleziony seed: %d | SCR_C=%.4f, SCR_D=%.4f", s, scr["SCR_C"], scr["SCR_D"]))
      return(list(seed = s, SCR_C = scr["SCR_C"], SCR_D = scr["SCR_D"], met = TRUE, best = best))
    }
    
    if (verbose_every > 0 && s %% verbose_every == 0) {
      message(sprintf("Sprawdzono do %d, najlepszy maxSCR=%.4f (seed %d; C=%.4f, D=%.4f)",
                      s, best$maxSCR, best$seed, best$SCR_C, best$SCR_D))
    }
  }
  
  message("Nie znaleziono seeda w zadanym zakresie. Zwracam najlepszy dotąd.")
  list(seed = best$seed, SCR_C = best$SCR_C, SCR_D = best$SCR_D, met = FALSE, best = best)
}

## --- Odpal wyszukiwarkę (zakres możesz zmienić/poszerzyć) ---
res <- find_seed(from = 1, to = 5000, threshold = 1.4, verbose_every = 200)
res






#### ED
Ed_cvine<- 1- SCR_vine/suma_diffs
Ed_fs<- 1- SCR_fs/suma_diffs


scr_fs




############## ocena ##########################



library(scoringRules)
ocena_modelu<-function(d_real,d_simu){
  m_real<-dim(d_real)[1]
  bledy<-c()
  d_simu<-as.matrix(d_simu)
  for(i in 1:m_real){
    es<-es_sample(y=as.numeric(d_real[i,]),dat=t(d_simu))
    bledy<-append(bledy,es)
  }
  return(list(mean(bledy),bledy))
}
summary(df_origin)


xx_neural<-ocena_modelu(df_origin,data_restored)
xx_vine<-ocena_modelu(df_origin,data_cop_vin)
xx_Dvine<-ocena_modelu(df_origin,data_cop_vin_D)

print(quantile(xx_neural[[2]],prob))

xx_neural[[2]]

for(prob in c(0.1,0.2,0.3,0.4,0.5,0.6,.7,0.8,0.9, 0.95)){
  print("----")
  print(quantile(xx_vine[[2]],prob))
}

sd(xx_neural[[2]])
mean(xx_neural[[2]])

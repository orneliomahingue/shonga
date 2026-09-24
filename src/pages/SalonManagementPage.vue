<template>
  <q-page class="management-page">
    <header class="page-header">
      <div>
        <span>PAINEL DO SALÃO</span>
        <h1>Gestão operacional</h1>
        <p>Organize o catálogo, a equipa e a disponibilidade do seu negócio.</p>
      </div>
      <div v-if="!loading && salons.length" class="header-actions">
        <q-btn
          flat
          rounded
          no-caps
          icon="event_note"
          label="Marcações"
          class="header-action secondary"
          to="/gestao-salao/marcacoes"
        />
        <q-btn
          unelevated
          rounded
          no-caps
          color="primary"
          icon="calendar_month"
          label="Gerir horários"
          class="header-action primary"
          to="/gestao-salao/agenda"
        />
      </div>
    </header>
    <q-banner v-if="error" rounded class="error-banner"
      ><q-icon name="error_outline" /> {{ error
      }}<template #action
        ><q-btn flat dense no-caps label="Tentar novamente" @click="init" /></template
    ></q-banner>
    <div v-if="loading" class="loading"><q-spinner color="primary" size="42px" /></div>
    <div v-else-if="!salons.length" class="empty">
      <span class="empty-icon"><q-icon name="storefront" /></span><small>PRIMEIRO PASSO</small>
      <h2>Crie o seu primeiro salão</h2>
      <p>
        Cadastre o espaço para depois configurar serviços, especialistas e horários de atendimento.
      </p>
      <q-btn
        unelevated
        rounded
        no-caps
        color="primary"
        icon-right="arrow_forward"
        label="Cadastrar salão"
        to="/cadastrar-salao"
      />
      <div class="empty-roadmap">
        <span><i>1</i><strong>Cadastre</strong><small>Dados do espaço</small></span
        ><q-icon name="chevron_right" /><span
          ><i>2</i><strong>Configure</strong><small>Serviços e equipa</small></span
        ><q-icon name="chevron_right" /><span
          ><i>3</i><strong>Publique</strong><small>Receba marcações</small></span
        >
      </div>
    </div>
    <template v-else>
      <section class="salon-context">
        <div class="salon-mark"><q-icon name="storefront" /></div>
        <div class="salon-copy">
          <small>ESPAÇO EM GESTÃO</small
          ><q-select
            v-model="selectedSalon"
            borderless
            dense
            :options="salons"
            option-label="name"
            dropdown-icon="expand_more"
            options-dense
            aria-label="Selecionar salão em gestão"
            popup-content-class="salon-options-menu"
            class="salon-select"
          />
        </div>
        <span class="approval-pill" :class="selectedSalon.status.toLowerCase()"
          ><q-icon
            :name="
              selectedSalon.status === 'APPROVED'
                ? 'verified'
                : selectedSalon.status === 'REJECTED'
                  ? 'cancel'
                  : 'schedule'
            "
          />{{
            selectedSalon.status === 'APPROVED'
              ? 'Aprovado'
              : selectedSalon.status === 'REJECTED'
                ? 'Rejeitado'
                : 'Em análise'
          }}</span
        >
        <q-btn
          unelevated
          round
          icon="edit_square"
          class="salon-edit-action"
          aria-label="Editar salão"
          @click="openSalonDialog"
          ><q-tooltip>Editar salão</q-tooltip></q-btn
        >
      </section>
      <q-banner v-if="selectedSalon.status !== 'APPROVED'" rounded class="approval-banner"
        ><q-icon name="info_outline" />
        <div>
          <strong>Salão em processo de aprovação</strong
          ><span>Pode preparar o catálogo e a equipa enquanto aguarda.</span>
        </div></q-banner
      >
      <section class="summary-grid">
        <article class="summary-card services-card">
          <span class="summary-icon services"><q-icon name="design_services" /></span>
          <div>
            <strong>{{ services.length }}</strong
            ><small>Serviços</small>
          </div>
        </article>
        <article class="summary-card active-card">
          <span class="summary-icon active"><q-icon name="verified" /></span>
          <div>
            <strong>{{ activeServices }}</strong
            ><small>Serviços activos</small>
          </div>
        </article>
        <article class="summary-card team-card">
          <span class="summary-icon team"><q-icon name="group" /></span>
          <div>
            <strong>{{ employees.length }}</strong
            ><small>Especialistas</small>
          </div>
        </article>
      </section>
      <section class="content-panel">
        <q-tabs
          v-model="tab"
          dense
          no-caps
          align="justify"
          active-color="primary"
          indicator-color="primary"
          class="management-tabs"
          ><q-tab
            name="services"
            icon="content_cut"
            :label="`Serviços (${services.length})`" /><q-tab
            name="employees"
            icon="people_outline"
            :label="`Especialistas (${employees.length})`"
        /></q-tabs>
        <div class="section-actions">
          <div>
            <h2>{{ tab === 'services' ? 'Catálogo de serviços' : 'Equipa de especialistas' }}</h2>
            <p>
              {{
                tab === 'services'
                  ? 'Defina preços, duração e disponibilidade.'
                  : 'Associe cada especialista aos serviços que realiza.'
              }}
            </p>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="add"
            class="catalog-add-action"
            :label="tab === 'services' ? 'Novo serviço' : 'Novo especialista'"
            @click="openDialog()"
          />
        </div>
        <div v-if="tab === 'services' && services.length" class="items">
          <article
            v-for="service in services"
            :key="service.id"
            class="catalog-item"
            :class="{ inactive: service.status !== 'ACTIVE' }"
          >
            <span class="item-icon"><q-icon name="spa" /></span>
            <div class="item-copy">
              <span class="item-category">{{ service.category.name }}</span>
              <h3>{{ service.name }}</h3>
              <p><q-icon name="schedule" /> {{ service.durationMin }} minutos</p>
            </div>
            <div class="item-meta">
              <strong>{{ service.price.toLocaleString('pt-MZ') }} MT</strong
              ><label
                >{{ service.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                <q-toggle
                  :model-value="service.status === 'ACTIVE'"
                  color="positive"
                  @update:model-value="toggleService(service)"
              /></label>
            </div>
            <q-btn
              flat
              round
              dense
              icon="edit_note"
              class="edit-btn"
              aria-label="Editar serviço"
              @click="openDialog(service)"
              ><q-tooltip>Editar</q-tooltip></q-btn
            >
          </article>
        </div>
        <div v-else-if="tab === 'employees' && employees.length" class="items">
          <article
            v-for="employee in employees"
            :key="employee.id"
            class="catalog-item"
            :class="{ inactive: employee.status !== 'ACTIVE' }"
          >
            <q-avatar class="employee-avatar">
              <img
                v-if="employee.photoUrl"
                :src="employee.photoUrl"
                :alt="`${employee.firstName} ${employee.lastName}`"
              />
              <template v-else>{{ employee.firstName[0] }}{{ employee.lastName[0] }}</template>
            </q-avatar>
            <div class="item-copy">
              <span class="item-category">{{ employee.jobTitle }}</span>
              <h3>{{ employee.firstName }} {{ employee.lastName }}</h3>
              <p>{{ employee.specialty || 'Especialidade não indicada' }}</p>
              <div class="service-tags">
                <span v-for="service in employee.services.slice(0, 3)" :key="service.name">{{
                  service.name
                }}</span
                ><span v-if="employee.services.length > 3">+{{ employee.services.length - 3 }}</span
                ><span v-if="!employee.services.length" class="muted">Sem serviços atribuídos</span>
              </div>
            </div>
            <label class="employee-status-control" :class="{ off: employee.status !== 'ACTIVE' }"
              ><span
                ><i></i><strong>{{ employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}</strong
                ><small>{{
                  employee.status === 'ACTIVE'
                    ? 'Disponível para marcações'
                    : 'Oculto nas marcações'
                }}</small></span
              ><q-toggle
                :model-value="employee.status === 'ACTIVE'"
                color="positive"
                :disable="updatingEmployeeStatus === employee.id"
                @update:model-value="toggleEmployeeStatus(employee)"
            /></label>
            <q-btn
              flat
              round
              dense
              icon="edit_note"
              class="edit-btn"
              aria-label="Editar especialista"
              @click="openDialog(employee)"
              ><q-tooltip>Editar</q-tooltip></q-btn
            >
          </article>
        </div>
        <div v-else class="tab-empty">
          <span><q-icon :name="tab === 'services' ? 'spa' : 'person_add'" /></span>
          <h3>{{ tab === 'services' ? 'Comece o seu catálogo' : 'Monte a sua equipa' }}</h3>
          <p>
            {{
              tab === 'services'
                ? 'Adicione o primeiro serviço que o salão oferece.'
                : 'Adicione especialistas e associe os serviços que realizam.'
            }}
          </p>
          <q-btn
            unelevated
            rounded
            no-caps
            color="primary"
            icon="add"
            :label="tab === 'services' ? 'Adicionar serviço' : 'Adicionar especialista'"
            @click="openDialog()"
          />
        </div>
      </section>
    </template>
    <q-dialog v-model="salonDialog">
      <q-card class="salon-dialog-card">
        <div class="dialog-header">
          <span class="dialog-icon"><q-icon name="storefront" /></span>
          <div>
            <small>DEFINIÇÕES DO SALÃO</small>
            <h2>Editar salão</h2>
            <p>Actualize os dados que os clientes usam para encontrar e contactar o espaço.</p>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Fechar" />
        </div>
        <q-form @submit="saveSalon">
          <q-card-section class="dialog-form salon-form">
            <div class="photo-field salon-photo-field">
              <button
                class="photo-preview salon-photo-preview"
                type="button"
                @click="salonPhotoInput?.click()"
              >
                <img
                  v-if="salonForm.logoUrl"
                  :src="salonForm.logoUrl"
                  alt="Pré-visualização do salão"
                />
                <q-icon v-else name="storefront" />
                <span><q-icon name="photo_camera" /></span>
              </button>
              <div>
                <strong>Foto do salão</strong>
                <small>Esta imagem aparece no cartão do salão na página inicial.</small>
                <small>JPG, PNG ou WebP · máximo 5 MB</small>
                <div class="photo-actions">
                  <q-btn
                    outline
                    rounded
                    dense
                    no-caps
                    color="primary"
                    icon="upload"
                    :label="salonForm.logoUrl ? 'Trocar foto' : 'Escolher foto'"
                    @click="salonPhotoInput?.click()"
                  />
                  <q-btn
                    v-if="salonForm.logoUrl"
                    flat
                    rounded
                    dense
                    no-caps
                    color="negative"
                    label="Remover"
                    @click="removeSalonPhoto"
                  />
                </div>
                <small v-if="salonPhotoError" class="photo-error">{{ salonPhotoError }}</small>
              </div>
              <input
                ref="salonPhotoInput"
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="selectSalonPhoto"
              />
            </div>
            <q-input
              v-model.trim="salonForm.name"
              outlined
              rounded
              label="Nome do salão *"
              :rules="[required]"
            />
            <div class="grid">
              <q-input
                v-model.trim="salonForm.nuit"
                outlined
                rounded
                label="NUIT *"
                :rules="[required, nuitRule]"
                maxlength="9"
              /><q-input
                v-model.trim="salonForm.phone"
                outlined
                rounded
                type="tel"
                label="Telefone *"
                :rules="[required]"
              />
            </div>
            <q-input
              v-model.trim="salonForm.email"
              outlined
              rounded
              type="email"
              label="Email (opcional)"
            />
            <q-input
              v-model.trim="salonForm.description"
              outlined
              rounded
              type="textarea"
              autogrow
              maxlength="500"
              label="Descrição (opcional)"
            />
            <div class="form-section-title">
              <q-icon name="location_on" />
              <div><strong>Localização</strong><small>Morada e posição exacta no mapa</small></div>
            </div>
            <q-input
              v-model.trim="salonForm.address"
              outlined
              rounded
              label="Endereço *"
              :rules="[required]"
            />
            <div class="grid">
              <q-select
                v-model="salonForm.province"
                outlined
                rounded
                :options="provinceOptions"
                label="Província *"
                :rules="[required]"
                @update:model-value="salonForm.district = ''"
              /><q-select
                v-model="salonForm.district"
                outlined
                rounded
                :options="districtOptions"
                label="Distrito ou cidade *"
                :rules="[required]"
              />
            </div>
            <q-input
              v-model.trim="salonForm.neighborhood"
              outlined
              rounded
              label="Bairro (opcional)"
            />
            <SalonMap
              v-if="salonDialog"
              :latitude="salonForm.latitude"
              :longitude="salonForm.longitude"
              :salon-name="salonForm.name || 'Salão'"
              selectable
              @update:coordinates="setSalonCoordinates"
            />
          </q-card-section>
          <q-card-actions class="dialog-actions"
            ><q-btn v-close-popup flat rounded no-caps label="Cancelar" /><q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              icon="save"
              label="Guardar alterações"
              :loading="salonSaving"
          /></q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
    <q-dialog v-model="dialog"
      ><q-card class="dialog-card" :class="{ 'service-dialog-card': tab === 'services' }"
        ><div class="dialog-header">
          <span class="dialog-icon"
            ><q-icon :name="tab === 'services' ? 'design_services' : 'person_add'"
          /></span>
          <div>
            <small>{{
              editingId ? 'EDIÇÃO' : tab === 'services' ? 'CATÁLOGO' : 'NOVA CONTRATAÇÃO'
            }}</small>
            <h2>
              {{
                editingId
                  ? tab === 'services'
                    ? 'Editar serviço'
                    : 'Editar especialista'
                  : tab === 'services'
                    ? 'Novo serviço'
                    : 'Novo especialista'
              }}
            </h2>
            <p>
              {{
                tab === 'services'
                  ? 'Preencha os dados do serviço oferecido.'
                  : editingId
                    ? 'Actualize o perfil profissional e os serviços associados.'
                    : 'Adicione os dados de acesso e defina o perfil profissional.'
              }}
            </p>
          </div>
          <q-btn v-close-popup flat round dense icon="close" aria-label="Fechar" />
        </div>
        <q-form @submit="save"
          ><q-card-section class="dialog-form service-dialog-form" v-if="tab === 'services'">
            <div class="service-form-intro">
              <span><q-icon name="auto_awesome" /></span>
              <div>
                <strong>Dados do serviço</strong
                ><small
                  >Estas informações serão apresentadas aos clientes no momento da marcação.</small
                >
              </div>
            </div>
            <q-input
              v-model.trim="serviceForm.name"
              outlined
              rounded
              label="Nome do serviço *"
              hint="Ex.: Corte feminino, manicure ou massagem"
              :rules="[required]"
              ><template #prepend><q-icon name="badge" /></template
            ></q-input>
            <q-select
              v-model="serviceForm.category"
              outlined
              rounded
              :options="categories"
              option-label="name"
              label="Categoria *"
              :rules="[required]"
              popup-content-class="service-category-menu"
              ><template #prepend><q-icon name="category" /></template
              ><template #selected-item="scope"
                ><span class="category-selection"
                  ><q-icon :name="categoryOptionIcon(scope.opt.name)" />{{ scope.opt.name }}</span
                ></template
              ><template #option="scope"
                ><q-item v-bind="scope.itemProps" class="category-option"
                  ><q-item-section avatar
                    ><span
                      ><q-icon :name="categoryOptionIcon(scope.opt.name)" /></span></q-item-section
                  ><q-item-section
                    ><q-item-label>{{ scope.opt.name }}</q-item-label></q-item-section
                  ><q-item-section side
                    ><q-icon
                      v-if="scope.selected"
                      name="check_circle"
                      color="primary" /></q-item-section></q-item></template
            ></q-select>
            <div class="service-values-grid">
              <q-input
                v-model.number="serviceForm.price"
                outlined
                rounded
                type="number"
                min="10"
                step="any"
                label="Preço *"
                :rules="[required]"
                ><template #prepend><q-icon name="payments" /></template
                ><template #append><span class="field-unit">MT</span></template></q-input
              ><q-input
                v-model.number="serviceForm.durationMin"
                outlined
                rounded
                type="number"
                min="5"
                step="5"
                label="Duração *"
                :rules="[required]"
                ><template #prepend><q-icon name="schedule" /></template
                ><template #append><span class="field-unit">min</span></template></q-input
              >
            </div>
            <q-input
              v-model.trim="serviceForm.description"
              outlined
              rounded
              type="textarea"
              rows="3"
              maxlength="500"
              counter
              label="Descrição (opcional)"
              hint="Explique brevemente o que está incluído no serviço"
              ><template #prepend><q-icon name="notes" /></template
            ></q-input> </q-card-section
          ><q-card-section class="dialog-form employee-dialog-form" v-else
            ><div class="form-section">
              <div class="form-section-title">
                <q-icon name="badge" />
                <div>
                  <strong>Dados pessoais</strong><small>Identificação do especialista</small>
                </div>
              </div>
              <div class="photo-field">
                <button class="photo-preview" type="button" @click="photoInput?.click()">
                  <img
                    v-if="employeeForm.photoUrl"
                    :src="employeeForm.photoUrl"
                    alt="Pré-visualização da foto"
                  />
                  <q-icon v-else name="person" />
                  <span><q-icon name="photo_camera" /></span>
                </button>
                <div>
                  <strong>Foto do especialista</strong>
                  <small>JPG, PNG ou WebP · máximo 5 MB</small>
                  <div class="photo-actions">
                    <q-btn
                      outline
                      rounded
                      dense
                      no-caps
                      color="primary"
                      icon="upload"
                      :label="employeeForm.photoUrl ? 'Trocar foto' : 'Escolher foto'"
                      @click="photoInput?.click()"
                    />
                    <q-btn
                      v-if="employeeForm.photoUrl"
                      flat
                      rounded
                      dense
                      no-caps
                      color="negative"
                      label="Remover"
                      @click="removePhoto"
                    />
                  </div>
                  <small v-if="photoError" class="photo-error">{{ photoError }}</small>
                </div>
                <input
                  ref="photoInput"
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  @change="selectPhoto"
                />
              </div>
              <div class="grid">
                <q-input
                  v-model="employeeForm.firstName"
                  outlined
                  rounded
                  label="Nome"
                  :rules="[required]"
                /><q-input
                  v-model="employeeForm.lastName"
                  outlined
                  rounded
                  label="Apelido"
                  :rules="[required]"
                />
              </div>
              <q-input
                v-if="!editingId"
                v-model="employeeForm.email"
                outlined
                rounded
                type="email"
                label="Email"
                :rules="[required]"
                ><template #prepend><q-icon name="mail_outline" /></template></q-input
              ><q-input
                v-if="!editingId"
                v-model="employeeForm.temporaryPassword"
                outlined
                rounded
                :type="showPassword ? 'text' : 'password'"
                label="Password temporária"
                hint="Mínimo de 8 caracteres"
                :rules="[required]"
                ><template #prepend><q-icon name="lock_outline" /></template
                ><template #append
                  ><q-btn
                    flat
                    round
                    dense
                    :icon="showPassword ? 'visibility_off' : 'visibility'"
                    @click="showPassword = !showPassword" /></template
              ></q-input>
            </div>
            <div class="form-section">
              <div class="form-section-title">
                <q-icon name="work_outline" />
                <div>
                  <strong>Perfil profissional</strong><small>Função e áreas de atuação</small>
                </div>
              </div>
              <div class="grid professional-selects">
                <q-select
                  v-model="employeeForm.jobTitle"
                  outlined
                  rounded
                  emit-value
                  map-options
                  :options="jobTitleOptions"
                  label="Função *"
                  :rules="[required]"
                  popup-content-class="professional-options-menu"
                  ><template #prepend><q-icon name="work" /></template
                  ><template #selected-item="scope"
                    ><span class="professional-selection"
                      ><q-icon :name="scope.opt.icon" />{{ scope.opt.label }}</span
                    ></template
                  ><template #option="scope"
                    ><q-item v-bind="scope.itemProps" class="professional-option"
                      ><q-item-section avatar
                        ><span><q-icon :name="scope.opt.icon" /></span></q-item-section
                      ><q-item-section
                        ><q-item-label>{{ scope.opt.label }}</q-item-label
                        ><q-item-label caption>{{
                          scope.opt.description
                        }}</q-item-label></q-item-section
                      ><q-item-section side
                        ><q-icon
                          v-if="scope.selected"
                          name="check_circle"
                          color="primary" /></q-item-section></q-item></template
                ></q-select>
                <q-select
                  v-model="employeeForm.specialty"
                  outlined
                  rounded
                  clearable
                  emit-value
                  map-options
                  :options="specialtyOptions"
                  label="Especialidade (opcional)"
                  popup-content-class="professional-options-menu"
                  ><template #prepend><q-icon name="workspace_premium" /></template
                  ><template #selected-item="scope"
                    ><span class="professional-selection"
                      ><q-icon :name="scope.opt.icon" />{{ scope.opt.label }}</span
                    ></template
                  ><template #option="scope"
                    ><q-item v-bind="scope.itemProps" class="professional-option"
                      ><q-item-section avatar
                        ><span><q-icon :name="scope.opt.icon" /></span></q-item-section
                      ><q-item-section
                        ><q-item-label>{{ scope.opt.label }}</q-item-label
                        ><q-item-label caption>{{
                          scope.opt.description
                        }}</q-item-label></q-item-section
                      ><q-item-section side
                        ><q-icon
                          v-if="scope.selected"
                          name="check_circle"
                          color="primary" /></q-item-section></q-item></template
                ></q-select>
              </div>
              <q-select
                v-model="employeeForm.serviceIds"
                class="services-multiselect"
                outlined
                rounded
                multiple
                emit-value
                map-options
                :options="serviceOptions"
                label="Serviços realizados"
                hint="Pode selecionar vários serviços"
                popup-content-class="services-options-menu"
                ><template #prepend><q-icon name="design_services" /></template>
                <template #selected-item="scope"
                  ><q-chip
                    removable
                    dense
                    class="service-selected-chip"
                    @remove="scope.removeAt(scope.index)"
                    ><q-icon :name="scope.opt.icon" class="service-chip-icon" />{{
                      scope.opt.label
                    }}</q-chip
                  ></template
                >
                <template #option="scope"
                  ><q-item v-bind="scope.itemProps" class="service-option"
                    ><q-item-section avatar
                      ><span class="service-option-icon"
                        ><q-icon :name="scope.opt.icon" /></span></q-item-section
                    ><q-item-section
                      ><q-item-label>{{ scope.opt.label }}</q-item-label
                      ><q-item-label caption>{{
                        scope.opt.categoryName
                      }}</q-item-label></q-item-section
                    ><q-item-section side
                      ><q-icon
                        :name="scope.selected ? 'check_circle' : 'add_circle_outline'"
                        :color="
                          scope.selected ? 'primary' : 'grey-5'
                        " /></q-item-section></q-item></template
              ></q-select></div></q-card-section
          ><q-card-actions class="dialog-actions"
            ><q-btn
              v-close-popup
              flat
              rounded
              no-caps
              icon="close"
              label="Cancelar"
              class="dialog-secondary-action"
            /><q-btn
              unelevated
              rounded
              no-caps
              color="primary"
              type="submit"
              icon="task_alt"
              class="dialog-primary-action"
              :label="
                editingId
                  ? 'Guardar alterações'
                  : tab === 'services'
                    ? 'Guardar serviço'
                    : 'Guardar especialista'
              "
              :loading="saving" /></q-card-actions></q-form></q-card
    ></q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { gql } from '@apollo/client/core'
import { useQuasar } from 'quasar'
import { apolloClient } from 'boot/apollo'
import SalonMap from 'components/SalonMap.vue'
const $q = useQuasar()
const loading = ref(true),
  saving = ref(false),
  showPassword = ref(false),
  error = ref(''),
  salons = ref([]),
  selectedSalon = ref(null),
  tab = ref('services'),
  services = ref([]),
  employees = ref([]),
  categories = ref([]),
  dialog = ref(false),
  editingId = ref(null),
  photoInput = ref(null),
  photoError = ref(''),
  salonPhotoInput = ref(null),
  salonPhotoError = ref(''),
  salonDialog = ref(false),
  salonSaving = ref(false),
  updatingEmployeeStatus = ref(null),
  locations = ref([])
const serviceForm = reactive({
  name: '',
  category: null,
  price: null,
  durationMin: 60,
  description: '',
})
const employeeForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  temporaryPassword: '',
  jobTitle: 'Especialista',
  specialty: '',
  photoUrl: '',
  serviceIds: [],
})
const salonForm = reactive({
  name: '',
  description: '',
  nuit: '',
  phone: '',
  email: '',
  logoUrl: '',
  address: '',
  province: '',
  district: '',
  neighborhood: '',
  latitude: null,
  longitude: null,
})
const required = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)) || 'Campo obrigatório'
const nuitRule = (v) => /^\d{9}$/.test(v) || 'Introduza um NUIT válido com 9 algarismos'
const serviceOptions = computed(() =>
  services.value.map((service) => ({
    label: service.name,
    value: service.id,
    categoryName: service.category?.name || 'Serviço do salão',
    icon: categoryOptionIcon(service.category?.name || service.name),
  })),
)
const jobTitleOptions = [
  {
    label: 'Cabeleireiro(a)',
    value: 'Cabeleireiro(a)',
    icon: 'content_cut',
    description: 'Cortes, penteados e tratamentos capilares',
  },
  {
    label: 'Barbeiro(a)',
    value: 'Barbeiro(a)',
    icon: 'face',
    description: 'Cabelo masculino, barba e acabamento',
  },
  {
    label: 'Manicure e pedicure',
    value: 'Manicure e pedicure',
    icon: 'back_hand',
    description: 'Cuidados, aplicação e tratamento de unhas',
  },
  {
    label: 'Maquilhador(a)',
    value: 'Maquilhador(a)',
    icon: 'brush',
    description: 'Maquilhagem social, profissional e para eventos',
  },
  {
    label: 'Esteticista',
    value: 'Esteticista',
    icon: 'spa',
    description: 'Tratamentos estéticos faciais e corporais',
  },
  {
    label: 'Massagista',
    value: 'Massagista',
    icon: 'self_improvement',
    description: 'Massagens terapêuticas e de relaxamento',
  },
  {
    label: 'Trancista',
    value: 'Trancista',
    icon: 'face_retouching_natural',
    description: 'Tranças, extensões e penteados protetores',
  },
  {
    label: 'Especialista em depilação',
    value: 'Especialista em depilação',
    icon: 'cleaning_services',
    description: 'Depilação facial e corporal',
  },
  {
    label: 'Especialista em sobrancelhas',
    value: 'Especialista em sobrancelhas',
    icon: 'visibility',
    description: 'Design, henna e cuidados de sobrancelhas',
  },
  {
    label: 'Especialista',
    value: 'Especialista',
    icon: 'workspace_premium',
    description: 'Profissional com atuação multidisciplinar',
  },
]
const specialtyOptions = [
  {
    label: 'Corte feminino',
    value: 'Corte feminino',
    icon: 'content_cut',
    description: 'Cortes e finalização para cabelo feminino',
  },
  {
    label: 'Corte masculino e barba',
    value: 'Corte masculino e barba',
    icon: 'face',
    description: 'Cortes, barba e acabamento masculino',
  },
  {
    label: 'Coloração e química',
    value: 'Coloração e química',
    icon: 'palette',
    description: 'Coloração, alisamento e tratamentos químicos',
  },
  {
    label: 'Tranças e extensões',
    value: 'Tranças e extensões',
    icon: 'face_retouching_natural',
    description: 'Tranças, extensões e penteados protetores',
  },
  {
    label: 'Unhas de gel e acrílico',
    value: 'Unhas de gel e acrílico',
    icon: 'back_hand',
    description: 'Alongamento, gel, acrílico e nail art',
  },
  {
    label: 'Maquilhagem profissional',
    value: 'Maquilhagem profissional',
    icon: 'brush',
    description: 'Maquilhagem para eventos, noivas e produções',
  },
  {
    label: 'Sobrancelhas e pestanas',
    value: 'Sobrancelhas e pestanas',
    icon: 'visibility',
    description: 'Design, henna, lifting e extensão de pestanas',
  },
  {
    label: 'Depilação',
    value: 'Depilação',
    icon: 'cleaning_services',
    description: 'Depilação facial e corporal',
  },
  {
    label: 'Estética facial',
    value: 'Estética facial',
    icon: 'face_4',
    description: 'Limpeza, hidratação e tratamento facial',
  },
  {
    label: 'Estética corporal',
    value: 'Estética corporal',
    icon: 'spa',
    description: 'Tratamentos e cuidados corporais',
  },
  {
    label: 'Massagem e relaxamento',
    value: 'Massagem e relaxamento',
    icon: 'self_improvement',
    description: 'Massagens terapêuticas e relaxantes',
  },
  {
    label: 'Cuidados capilares',
    value: 'Cuidados capilares',
    icon: 'water_drop',
    description: 'Hidratação, reconstrução e tratamento',
  },
]
const categoryOptionIcon = (name = '') => {
  const value = name.toLocaleLowerCase('pt')
  if (value.includes('cabelo') || value.includes('barba')) return 'content_cut'
  if (value.includes('unha')) return 'back_hand'
  if (value.includes('maquilh')) return 'brush'
  if (value.includes('spa') || value.includes('massagem')) return 'spa'
  return 'auto_awesome'
}
const provinceOptions = computed(() => locations.value.map((item) => item.name))
const districtOptions = computed(
  () =>
    locations.value
      .find((item) => item.name === salonForm.province)
      ?.districts.map((item) => item.name) ?? [],
)
const activeServices = computed(
  () => services.value.filter((service) => service.status === 'ACTIVE').length,
)
const MY_SALONS = gql`
  query MySalons {
    mySalons {
      id
      name
      description
      nuit
      phone
      email
      address
      province
      district
      neighborhood
      latitude
      longitude
      logoUrl
      status
    }
  }
`
const LOCATIONS = gql`
  query SalonLocations {
    provinces {
      id
      name
      districts {
        id
        name
      }
    }
  }
`
const UPDATE_SALON = gql`
  mutation UpdateSalon($salonId: ID!, $input: UpdateSalonInput!) {
    updateSalon(salonId: $salonId, input: $input) {
      id
      name
      description
      nuit
      phone
      email
      address
      province
      district
      neighborhood
      latitude
      longitude
      logoUrl
      status
    }
  }
`
const CATEGORIES = gql`
  query Categories {
    serviceCategories {
      id
      name
    }
  }
`
const DATA = gql`
  query Manage($id: ID!) {
    managedSalonServices(salonId: $id) {
      id
      name
      description
      price
      durationMin
      status
      category {
        id
        name
      }
    }
    salonEmployees(salonId: $id) {
      id
      firstName
      lastName
      email
      jobTitle
      specialty
      photoUrl
      status
      services {
        id
        name
      }
    }
  }
`
const CREATE_SERVICE = gql`
  mutation CreateService($input: ServiceInput!) {
    createSalonService(input: $input) {
      id
      description
    }
  }
`
const UPDATE_SERVICE = gql`
  mutation UpdateService($id: ID!, $input: ServiceUpdateInput!) {
    updateSalonService(id: $id, input: $input) {
      id
      description
    }
  }
`
const CREATE_EMPLOYEE = gql`
  mutation CreateEmployee($input: EmployeeInput!) {
    createSalonEmployee(input: $input) {
      id
    }
  }
`
const UPDATE_EMPLOYEE = gql`
  mutation UpdateEmployee($id: ID!, $input: EmployeeUpdateInput!) {
    updateSalonEmployee(id: $id, input: $input) {
      id
    }
  }
`
const EMPLOYEE_STATUS = gql`
  mutation EmployeeStatus($id: ID!, $status: EmployeeStatus!) {
    updateSalonEmployeeStatus(id: $id, status: $status) {
      id
      status
    }
  }
`
const SERVICE_STATUS = gql`
  mutation ServiceStatus($id: ID!, $status: ServiceStatus!) {
    setSalonServiceStatus(id: $id, status: $status) {
      id
      status
    }
  }
`
async function init() {
  loading.value = true
  try {
    const [{ data: s }, { data: c }, { data: l }] = await Promise.all([
      apolloClient.query({ query: MY_SALONS, fetchPolicy: 'network-only' }),
      apolloClient.query({ query: CATEGORIES }),
      apolloClient.query({ query: LOCATIONS }),
    ])
    salons.value = s.mySalons.map((salon) => ({ ...salon }))
    categories.value = c.serviceCategories
    locations.value = l.provinces
    selectedSalon.value = salons.value[0] ?? null
    if (selectedSalon.value) await loadData()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
async function loadData() {
  if (!selectedSalon.value) return
  const { data } = await apolloClient.query({
    query: DATA,
    variables: { id: selectedSalon.value.id },
    fetchPolicy: 'network-only',
  })
  services.value = data.managedSalonServices
  employees.value = data.salonEmployees
}
function openSalonDialog() {
  salonPhotoError.value = ''
  Object.assign(salonForm, {
    name: selectedSalon.value.name,
    description: selectedSalon.value.description || '',
    nuit: selectedSalon.value.nuit,
    phone: selectedSalon.value.phone,
    email: selectedSalon.value.email || '',
    logoUrl: selectedSalon.value.logoUrl || '',
    address: selectedSalon.value.address,
    province: selectedSalon.value.province,
    district: selectedSalon.value.district,
    neighborhood: selectedSalon.value.neighborhood || '',
    latitude: selectedSalon.value.latitude,
    longitude: selectedSalon.value.longitude,
  })
  salonDialog.value = true
}
const setSalonCoordinates = (coordinates) => Object.assign(salonForm, coordinates)
function removeSalonPhoto() {
  salonForm.logoUrl = ''
  salonPhotoError.value = ''
  if (salonPhotoInput.value) salonPhotoInput.value.value = ''
}
async function selectSalonPhoto(event) {
  const file = event.target.files?.[0]
  salonPhotoError.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    salonPhotoError.value = 'Escolha uma imagem JPG, PNG ou WebP.'
    event.target.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    salonPhotoError.value = 'A imagem deve ter no máximo 5 MB.'
    event.target.value = ''
    return
  }
  try {
    const bitmap = await createImageBitmap(file)
    const targetRatio = 3 / 2
    let sourceWidth = bitmap.width,
      sourceHeight = bitmap.height,
      sourceX = 0,
      sourceY = 0
    if (sourceWidth / sourceHeight > targetRatio) {
      sourceWidth = sourceHeight * targetRatio
      sourceX = (bitmap.width - sourceWidth) / 2
    } else {
      sourceHeight = sourceWidth / targetRatio
      sourceY = (bitmap.height - sourceHeight) / 2
    }
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    canvas
      .getContext('2d')
      .drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 900, 600)
    bitmap.close()
    salonForm.logoUrl = canvas.toDataURL('image/jpeg', 0.8)
    if (salonForm.logoUrl.length > 750_000) {
      salonForm.logoUrl = ''
      salonPhotoError.value = 'Não foi possível reduzir esta imagem. Escolha uma imagem mais leve.'
    }
  } catch {
    salonPhotoError.value = 'Não foi possível processar esta imagem.'
  }
}
async function saveSalon() {
  salonSaving.value = true
  error.value = ''
  try {
    const input = {
      name: salonForm.name,
      nuit: salonForm.nuit,
      phone: salonForm.phone,
      address: salonForm.address,
      province: salonForm.province,
      district: salonForm.district,
      description: salonForm.description || null,
      email: salonForm.email || null,
      neighborhood: salonForm.neighborhood || null,
      latitude: salonForm.latitude,
      longitude: salonForm.longitude,
      logoUrl: salonForm.logoUrl || null,
    }
    const { data } = await apolloClient.mutate({
      mutation: UPDATE_SALON,
      variables: { salonId: selectedSalon.value.id, input },
    })
    const updatedSalon = { ...data.updateSalon }
    salons.value = salons.value.map((item) => (item.id === updatedSalon.id ? updatedSalon : item))
    selectedSalon.value = updatedSalon
    salonDialog.value = false
  } catch (e) {
    error.value = e.message
  } finally {
    salonSaving.value = false
  }
}
function openDialog(item = null) {
  showPassword.value = false
  photoError.value = ''
  editingId.value = item?.id ?? null
  if (tab.value === 'services')
    Object.assign(
      serviceForm,
      item
        ? {
            name: item.name,
            category: categories.value.find((c) => c.id === item.category.id) ?? item.category,
            price: item.price,
            durationMin: item.durationMin,
            description: item.description || '',
          }
        : { name: '', category: null, price: null, durationMin: 60, description: '' },
    )
  else
    Object.assign(
      employeeForm,
      item
        ? {
            firstName: item.firstName,
            lastName: item.lastName,
            email: item.email,
            temporaryPassword: '',
            jobTitle: item.jobTitle,
            specialty: item.specialty || '',
            photoUrl: item.photoUrl || '',
            serviceIds: item.services.map((s) => s.id),
          }
        : {
            firstName: '',
            lastName: '',
            email: '',
            temporaryPassword: '',
            jobTitle: 'Especialista',
            specialty: '',
            photoUrl: '',
            serviceIds: [],
          },
    )
  dialog.value = true
}
function removePhoto() {
  employeeForm.photoUrl = ''
  photoError.value = ''
  if (photoInput.value) photoInput.value.value = ''
}
async function selectPhoto(event) {
  const file = event.target.files?.[0]
  photoError.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    photoError.value = 'Escolha uma imagem JPG, PNG ou WebP.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    photoError.value = 'A imagem deve ter no máximo 5 MB.'
    return
  }
  try {
    const bitmap = await createImageBitmap(file)
    const size = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    canvas
      .getContext('2d')
      .drawImage(
        bitmap,
        (bitmap.width - size) / 2,
        (bitmap.height - size) / 2,
        size,
        size,
        0,
        0,
        512,
        512,
      )
    bitmap.close()
    employeeForm.photoUrl = canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    photoError.value = 'Não foi possível processar esta imagem.'
  }
}
async function save() {
  saving.value = true
  error.value = ''
  const wasEditing = Boolean(editingId.value)
  const entity = tab.value === 'services' ? 'serviço' : 'especialista'
  try {
    if (tab.value === 'services') {
      const input = {
        categoryId: serviceForm.category.id,
        name: serviceForm.name,
        description: serviceForm.description.trim() || null,
        price: Number(serviceForm.price),
        durationMin: Number(serviceForm.durationMin),
      }
      if (editingId.value)
        await apolloClient.mutate({
          mutation: UPDATE_SERVICE,
          variables: { id: editingId.value, input },
        })
      else
        await apolloClient.mutate({
          mutation: CREATE_SERVICE,
          variables: { input: { salonId: selectedSalon.value.id, ...input } },
        })
    } else if (editingId.value) {
      const input = {
        firstName: employeeForm.firstName,
        lastName: employeeForm.lastName,
        jobTitle: employeeForm.jobTitle,
        specialty: employeeForm.specialty,
        photoUrl: employeeForm.photoUrl,
        serviceIds: employeeForm.serviceIds,
      }
      await apolloClient.mutate({
        mutation: UPDATE_EMPLOYEE,
        variables: { id: editingId.value, input },
      })
    } else
      await apolloClient.mutate({
        mutation: CREATE_EMPLOYEE,
        variables: { input: { salonId: selectedSalon.value.id, ...employeeForm } },
      })
    dialog.value = false
    await loadData()
    $q.notify({
      type: 'positive',
      icon: 'task_alt',
      message: `${entity === 'serviço' ? 'Serviço' : 'Especialista'} ${wasEditing ? 'atualizado' : 'registado'} com sucesso`,
      caption: wasEditing
        ? 'As alterações já estão disponíveis.'
        : entity === 'serviço'
          ? 'O novo serviço foi adicionado ao catálogo.'
          : 'O novo profissional foi adicionado à equipa.',
      position: 'top-right',
      timeout: 3500,
      classes: 'shonga-success-toast',
      actions: [{ icon: 'close', color: 'white', round: true, 'aria-label': 'Fechar' }],
    })
  } catch (e) {
    error.value = e.message
    $q.notify({
      type: 'negative',
      icon: 'error_outline',
      message: `Não foi possível guardar o ${entity}`,
      caption: e.message,
      position: 'top-right',
      timeout: 5000,
      classes: 'shonga-error-toast',
      actions: [{ icon: 'close', color: 'white', round: true, 'aria-label': 'Fechar' }],
    })
  } finally {
    saving.value = false
  }
}
async function toggleService(service) {
  await apolloClient.mutate({
    mutation: SERVICE_STATUS,
    variables: { id: service.id, status: service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
  })
  await loadData()
}
async function toggleEmployeeStatus(employee) {
  const status = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  updatingEmployeeStatus.value = employee.id
  error.value = ''
  try {
    const { data } = await apolloClient.mutate({
      mutation: EMPLOYEE_STATUS,
      variables: { id: employee.id, status },
    })
    employees.value = employees.value.map((item) =>
      item.id === employee.id ? { ...item, status: data.updateSalonEmployeeStatus.status } : item,
    )
    $q.notify({
      type: 'positive',
      icon: status === 'ACTIVE' ? 'how_to_reg' : 'person_off',
      message: `Especialista ${status === 'ACTIVE' ? 'ativado' : 'inativado'} com sucesso`,
      caption:
        status === 'ACTIVE'
          ? 'O profissional voltou a estar disponível para marcações.'
          : 'O profissional deixou de aparecer para novas marcações.',
      position: 'top-right',
      timeout: 3500,
      classes: 'shonga-success-toast',
    })
  } catch (e) {
    error.value = e.message
    $q.notify({
      type: 'negative',
      message: 'Não foi possível alterar o estado',
      caption: e.message,
      position: 'top-right',
    })
  } finally {
    updatingEmployeeStatus.value = null
  }
}
watch(selectedSalon, (value, old) => {
  if (value?.id !== old?.id) loadData()
})
onMounted(init)
</script>

<style scoped lang="scss">
.management-page {
  width: min(100%, 920px);
  min-height: 100vh;
  margin: auto;
  padding: 32px 20px 110px;
  background: #faf8f9;
  color: #30272a;
}
.page-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 26px;
  overflow: hidden;
  margin-bottom: 20px;
  padding: 24px 26px;
  border: 1px solid #eee1e6;
  border-radius: 24px;
  background: linear-gradient(125deg, #fff 54%, #fff5f8);
  box-shadow: 0 10px 30px rgba(71, 28, 44, 0.055);
}
.page-header::after {
  position: absolute;
  top: -55px;
  right: -30px;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(205, 35, 98, 0.09), transparent 70%);
  content: '';
  pointer-events: none;
}
.page-header > div {
  position: relative;
  z-index: 1;
}
.page-header > div:first-child > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #ad134e;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.6px;
}
.page-header > div:first-child > span::before {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: #c91e5d;
  content: '';
}
.page-header h1 {
  margin: 7px 0 6px;
  font-size: clamp(27px, 3.5vw, 34px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.8px;
}
.page-header p {
  margin: 0;
  color: #8d8085;
  font-size: 11px;
  line-height: 1.5;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: none;
}
.header-action {
  min-height: 44px;
  padding-inline: 18px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.header-action.secondary {
  border: 1px solid #e7c5d2;
  background: rgba(255, 255, 255, 0.75) !important;
  color: #a41149;
}
.header-action.secondary:hover {
  border-color: #c91e5d;
  background: #fff !important;
}
.header-action.primary {
  min-width: 150px;
  background: linear-gradient(135deg, #ad134e, #d62b6a) !important;
  box-shadow: 0 8px 18px rgba(173, 19, 78, 0.2);
}
.header-action :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 7px;
}
.error-banner {
  margin-bottom: 16px;
  background: #feecee;
  color: #ad2634;
}
.loading {
  display: grid;
  min-height: 420px;
  place-items: center;
}
.empty {
  padding: 80px 20px;
  border: 1px solid #eee5e8;
  border-radius: 24px;
  background: #fff;
  text-align: center;
}
.empty > .q-icon {
  color: #d4a7b8;
  font-size: 72px;
}
.empty h2 {
  margin: 12px 0 5px;
}
.empty p {
  margin: 0 auto 20px;
  color: #897d81;
}
.salon-context {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  overflow: hidden;
  border: 1px solid #eadfe3;
  border-radius: 22px;
  background: linear-gradient(135deg, #fff 62%, #fff7fa);
  box-shadow: 0 10px 30px rgba(71, 28, 44, 0.07);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.salon-context::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: linear-gradient(#b1114e, #dd477e);
  content: '';
}
.salon-context:hover {
  border-color: #e5ccd6;
  box-shadow: 0 14px 36px rgba(71, 28, 44, 0.1);
  transform: translateY(-1px);
}
.salon-mark {
  display: grid;
  width: 50px;
  height: 50px;
  flex: none;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(145deg, #b1114e, #d83c74);
  color: #fff;
  font-size: 23px;
  box-shadow: 0 8px 18px rgba(177, 17, 78, 0.2);
}
.salon-copy {
  min-width: 0;
  flex: 1;
}
.salon-copy > small {
  display: block;
  margin-bottom: -3px;
  color: #9a8e92;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1px;
}
.salon-select {
  width: min(100%, 420px);
  font-size: 17px;
  font-weight: 700;
}
.salon-select :deep(.q-field__control) {
  min-height: 32px;
  color: #31272b;
}
.salon-select :deep(.q-field__append) {
  color: #9d8490;
  transition: color 0.2s ease;
}
.salon-select:hover :deep(.q-field__append) {
  color: #ad134e;
}
.approval-pill,
.active-dot {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border-radius: 999px;
  background: #fff1d5;
  color: #815d0a;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
}
.approval-pill > .q-icon {
  font-size: 13px;
}
.approval-pill i,
.active-dot i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.approval-pill.approved,
.active-dot {
  background: #ddf6e9;
  color: #197148;
}
.approval-pill.rejected,
.active-dot.off {
  background: #fee5e7;
  color: #a82837;
}
.salon-edit-action {
  width: 42px;
  height: 42px;
  flex: none;
  background: #f9e6ed !important;
  color: #ad134e;
  font-size: 19px;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.salon-edit-action:hover {
  background: #ad134e !important;
  color: #fff;
  transform: rotate(-3deg) scale(1.04);
}
:global(.salon-options-menu) {
  margin-top: 6px;
  padding: 6px;
  border: 1px solid #eadfe3;
  border-radius: 15px;
  box-shadow: 0 16px 38px rgba(71, 28, 44, 0.16);
}
:global(.salon-options-menu .q-item) {
  min-height: 42px;
  border-radius: 10px;
  font-size: 12px;
}
:global(.salon-options-menu .q-item--active) {
  background: #fbeaf0;
  color: #a61149;
}
.approval-banner {
  display: flex;
  margin: 12px 0 16px;
  background: #fff3dc;
  color: #75540b;
}
.approval-banner .q-icon {
  font-size: 20px;
}
.approval-banner div {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
}
.approval-banner span {
  font-size: 10px;
  opacity: 0.78;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}
.summary-grid article {
  position: relative;
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  overflow: hidden;
  padding: 15px 16px;
  border: 1px solid color-mix(in srgb, var(--metric-color) 16%, #eee5e8);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff 55%, var(--metric-surface));
  box-shadow: 0 7px 20px rgba(71, 28, 44, 0.045);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.summary-grid article::after {
  position: absolute;
  top: 0;
  right: 14px;
  left: 14px;
  height: 2px;
  border-radius: 0 0 999px 999px;
  background: var(--metric-color);
  content: '';
  opacity: 0.55;
}
.summary-grid article:hover {
  border-color: color-mix(in srgb, var(--metric-color) 28%, #eee5e8);
  box-shadow: 0 11px 26px rgba(71, 28, 44, 0.08);
  transform: translateY(-2px);
}
.services-card {
  --metric-color: #b31250;
  --metric-surface: #fff4f8;
}
.active-card {
  --metric-color: #19865a;
  --metric-surface: #f1fbf6;
}
.team-card {
  --metric-color: #7158c7;
  --metric-surface: #f7f4ff;
}
.summary-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  border-radius: 14px;
  font-size: 21px;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
}
.summary-icon.services {
  background: #fbe4ec;
  color: #ac124d;
}
.summary-icon.active {
  background: #e1f6eb;
  color: #197149;
}
.summary-icon.team {
  background: #eee9ff;
  color: #6f56bd;
}
.summary-grid article > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.summary-grid strong {
  color: #34292d;
  font-size: 23px;
  line-height: 1;
  letter-spacing: -0.4px;
}
.summary-grid small {
  margin-top: 4px;
  color: #8e8286;
  font-size: 9px;
  font-weight: 600;
  line-height: 1.2;
}
.content-panel {
  overflow: hidden;
  border: 1px solid #eadfe3;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 12px 34px rgba(70, 27, 43, 0.07);
}
.management-tabs {
  margin: 10px;
  padding: 4px;
  border: 1px solid #eee4e8;
  border-radius: 16px;
  background: #faf6f8;
}
.management-tabs :deep(.q-tab) {
  min-height: 48px;
  border-radius: 12px;
  color: #75696e;
  font-size: 11px;
  font-weight: 700;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}
.management-tabs :deep(.q-tab--active) {
  background: #fff;
  color: #ad134e;
  box-shadow: 0 5px 14px rgba(91, 37, 57, 0.09);
}
.management-tabs :deep(.q-tab__indicator) {
  display: none;
}
.management-tabs :deep(.q-tab__icon) {
  margin-bottom: 2px;
  font-size: 20px;
}
.section-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 22px 20px 18px;
}
.section-actions h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: -0.25px;
}
.section-actions p {
  margin: 5px 0 0;
  color: #918588;
  font-size: 10px;
}
.catalog-add-action {
  min-height: 44px;
  padding-inline: 19px;
  background: linear-gradient(135deg, #ad134e, #d62b6a) !important;
  font-size: 11px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(173, 19, 78, 0.2);
}
.catalog-add-action :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 7px;
}
.items {
  display: grid;
  gap: 9px;
  padding: 0 14px 14px;
}
.items article {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 14px;
  padding: 15px 14px;
  border: 1px solid #eee5e8;
  border-radius: 17px;
  background: #fff;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.items article:last-child {
  border-bottom: 1px solid #eee5e8;
}
.items article:hover {
  border-color: #e7ccd6;
  background: #fffafb;
  box-shadow: 0 8px 20px rgba(73, 29, 45, 0.07);
  transform: translateY(-1px);
}
.items article.inactive {
  background: #faf8f9;
  opacity: 0.68;
}
.item-icon,
.employee-avatar {
  display: grid;
  width: 48px;
  height: 48px;
  flex: none;
  place-items: center;
  border-radius: 15px;
  background: linear-gradient(145deg, #fce7ee, #f8dce7);
  color: #ad134e;
  font-size: 21px;
  box-shadow: inset 0 0 0 1px rgba(179, 18, 80, 0.05);
}
.employee-avatar {
  background: #eee9ff;
  color: #6850b0;
  font-size: 14px;
  font-weight: 800;
}
.item-copy {
  min-width: 0;
  flex: 1;
}
.item-category {
  color: #ae1650;
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.items h3 {
  margin: 3px 0 6px;
  color: #3b3034;
  font-size: 14px;
  font-weight: 700;
}
.items p {
  margin: 0;
  color: #8b7f83;
  font-size: 10px;
}
.items p .q-icon {
  font-size: 12px;
}
.item-meta {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 5px;
}
.item-meta strong {
  color: #a8124c;
  font-size: 14px;
  font-weight: 800;
}
.item-meta label {
  display: flex;
  align-items: center;
  color: #8b7f83;
  font-size: 9px;
}
.employee-status-control {
  display: flex;
  min-width: 158px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px 7px 10px;
  border: 1px solid #dceee4;
  border-radius: 13px;
  background: #f4fbf7;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.employee-status-control.off {
  border-color: #f0dadd;
  background: #fff7f8;
}
.employee-status-control > span {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  column-gap: 6px;
}
.employee-status-control i {
  width: 7px;
  height: 7px;
  grid-row: 1;
  border-radius: 50%;
  background: #1c8457;
  box-shadow: 0 0 0 4px #dff3e8;
}
.employee-status-control.off i {
  background: #b82d3d;
  box-shadow: 0 0 0 4px #f8e2e5;
}
.employee-status-control strong {
  color: #236e4c;
  font-size: 9px;
}
.employee-status-control.off strong {
  color: #a82a39;
}
.employee-status-control small {
  grid-column: 1/-1;
  margin-top: 2px;
  color: #8c8084;
  font-size: 7px;
}
.employee-status-control .q-toggle {
  flex: none;
}
.edit-btn {
  width: 36px;
  height: 36px;
  flex: none;
  background: #f7f1f3;
  color: #9b8e93;
  font-size: 18px;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}
.edit-btn:hover {
  background: #f7dfe8;
  color: #ad134e;
  transform: scale(1.05);
}
.service-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.service-tags span {
  padding: 3px 7px;
  border-radius: 7px;
  background: #f6eff2;
  color: #795b67;
  font-size: 8px;
}
.service-tags span.muted {
  background: #f3f1f2;
  color: #988e91;
}
.tab-empty {
  padding: 62px 20px 68px;
  text-align: center;
}
.tab-empty > span {
  display: grid;
  width: 68px;
  height: 68px;
  margin: auto;
  place-items: center;
  border-radius: 22px;
  background: #f7e8ee;
  color: #bd6e8b;
  font-size: 32px;
}
.tab-empty h3 {
  margin: 14px 0 5px;
  font-size: 18px;
}
.tab-empty p {
  margin: 0 0 17px;
  color: #918589;
  font-size: 11px;
}
.dialog-card {
  width: min(94vw, 560px);
  overflow: hidden;
  border-radius: 22px;
}
.salon-dialog-card {
  width: min(94vw, 720px);
  max-height: 92vh;
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(55, 22, 34, 0.24);
}
.salon-form {
  display: grid;
  max-height: calc(92vh - 175px);
  overflow-y: auto;
}
.dialog-card > div:first-child {
  padding: 22px 24px 10px;
}
.dialog-card h2 {
  margin: 0;
  font-size: 22px;
}
.dialog-form {
  display: grid;
  gap: 5px;
  padding: 14px 24px;
}
.dialog-card .q-card__actions {
  padding: 10px 24px 22px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.grid > * {
  min-width: 0;
}
@media (max-width: 600px) {
  .management-page {
    padding: 24px 16px 100px;
  }
  .page-header {
    align-items: stretch;
    flex-direction: column;
    gap: 19px;
    padding: 21px 18px 18px;
  }
  .page-header h1 {
    font-size: 27px;
    white-space: nowrap;
  }
  .page-header p {
    font-size: 11px;
  }
  .header-actions > .q-btn {
    height: 44px;
    flex: 1;
    min-width: 0;
  }
  .header-action {
    padding-inline: 10px;
  }
  .salon-context {
    align-items: flex-start;
  }
  .approval-pill {
    margin-top: 5px;
    padding: 5px 7px;
    font-size: 8px;
  }
  .summary-grid {
    gap: 6px;
  }
  .summary-grid article {
    gap: 7px;
    padding: 10px;
  }
  .summary-icon {
    width: 35px;
    height: 35px;
    font-size: 17px;
  }
  .summary-grid small {
    font-size: 8px;
  }
  .section-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .section-actions .q-btn {
    height: 43px;
  }
  .items article {
    align-items: flex-start;
    padding: 14px;
  }
  .item-icon,
  .employee-avatar {
    width: 42px;
    height: 42px;
  }
  .item-meta {
    align-items: flex-end;
  }
  .item-meta label {
    font-size: 0;
  }
  .active-dot {
    padding: 5px 7px;
    font-size: 8px;
  }
  .employee-status-control {
    min-width: 0;
    padding: 3px;
    border: 0;
    background: transparent;
  }
  .employee-status-control > span {
    display: none;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 370px) {
  .page-header h1 {
    font-size: 24px;
  }
  .summary-icon {
    width: 31px;
    height: 31px;
    border-radius: 10px;
    font-size: 15px;
  }
  .summary-grid article {
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 6px;
    padding-inline: 6px;
    text-align: center;
  }
  .salon-mark {
    display: none;
  }
}
.management-page {
  padding-top: 0;
}
.app-header {
  position: sticky;
  z-index: 10;
  top: 0;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  border-bottom: 1px solid #eee4e7;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 18px rgba(74, 28, 45, 0.035);
  backdrop-filter: blur(14px);
}
.app-header-inner {
  display: flex;
  width: min(calc(100% - 36px), 920px);
  height: 72px;
  align-items: center;
  justify-content: space-between;
  margin: auto;
}
.brand,
.profile-button {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.brand {
  gap: 10px;
}
.brand-mark {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(145deg, #a70d48, #da3471);
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 7px 17px rgba(173, 18, 77, 0.22);
}
.brand-copy,
.user-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.brand-copy strong {
  color: #9f1047;
  font-size: 15px;
  line-height: 1.1;
  letter-spacing: 2px;
}
.brand-copy small,
.user-copy small {
  color: #918589;
  font-size: 8px;
}
.app-header-user {
  display: flex;
  align-items: center;
  gap: 9px;
}
.profile-button {
  gap: 8px;
}
.user-copy {
  align-items: flex-end;
}
.user-copy strong {
  color: #3b3034;
  font-size: 11px;
}
.header-avatar {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 2px solid #fff;
  background: #fbe4ec;
  color: #ae154f;
  font-size: 14px;
  box-shadow: 0 0 0 1px #f1dce4;
}
.header-divider {
  width: 1px;
  height: 24px;
  background: #eee4e7;
}
.app-logout {
  background: #fff4f5;
  color: #b32434;
}
.page-header {
  margin-top: 32px;
}
@media (max-width: 600px) {
  .management-page {
    padding-top: 0;
  }
  .app-header-inner {
    height: 68px;
  }
  .brand-copy small,
  .user-copy {
    display: none;
  }
  .brand-mark {
    width: 38px;
    height: 38px;
  }
  .brand-copy strong {
    font-size: 14px;
    letter-spacing: 1.6px;
  }
  .app-header-user {
    gap: 7px;
  }
  .header-avatar {
    width: 38px;
    height: 38px;
  }
  .page-header {
    margin-top: 24px;
  }
}
@media (max-width: 350px) {
  .brand-copy strong {
    font-size: 13px;
  }
  .header-divider {
    display: none;
  }
}
.empty {
  display: flex;
  min-height: 430px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 55px 28px;
}
.empty > .empty-icon {
  display: grid;
  width: 72px;
  height: 72px;
  place-items: center;
  border-radius: 23px;
  background: #f8e8ee;
  color: #b65d7d;
  font-size: 34px;
}
.empty > small {
  margin-top: 18px;
  color: #ad134e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.4px;
}
.empty h2 {
  max-width: 420px;
  margin: 6px auto 8px;
  font-size: 27px;
  line-height: 1.2;
  letter-spacing: -0.5px;
}
.empty > p {
  max-width: 470px;
  margin: 0 auto 20px;
  color: #897d81;
  font-size: 12px;
  line-height: 1.6;
}
.empty > .q-btn {
  min-width: 180px;
  height: 45px;
  font-weight: 800;
}
.empty-roadmap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 13px;
  width: min(100%, 530px);
  margin-top: 38px;
  padding-top: 25px;
  border-top: 1px solid #f0e7ea;
}
.empty-roadmap > span {
  display: flex;
  min-width: 100px;
  align-items: center;
  flex-direction: column;
}
.empty-roadmap i {
  display: grid;
  width: 25px;
  height: 25px;
  margin-bottom: 6px;
  place-items: center;
  border-radius: 8px;
  background: #f8e8ee;
  color: #ad134e;
  font-size: 9px;
  font-style: normal;
  font-weight: 800;
}
.empty-roadmap strong {
  font-size: 10px;
}
.empty-roadmap small {
  color: #978b8f;
  font-size: 8px;
}
.empty-roadmap > .q-icon {
  color: #d6c9ce;
}
@media (max-width: 600px) {
  .empty {
    min-height: 0;
    padding: 45px 18px;
  }
  .empty h2 {
    font-size: 24px;
  }
  .empty > p {
    font-size: 11px;
  }
  .empty-roadmap {
    gap: 5px;
    margin-top: 30px;
  }
  .empty-roadmap > span {
    min-width: 0;
    flex: 1;
  }
  .empty-roadmap small {
    font-size: 7px;
  }
}
@media (max-width: 360px) {
  .empty-roadmap > .q-icon {
    display: none;
  }
  .empty-roadmap strong {
    font-size: 9px;
  }
}
.management-page {
  padding-top: 72px;
}
.management-page > .app-header {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  width: auto;
  margin: 0;
}
.management-page > .page-header {
  margin-top: 32px;
}
@media (max-width: 600px) {
  .management-page {
    padding-top: 68px;
  }
  .management-page > .page-header {
    margin-top: 24px;
  }
}
.management-page {
  padding-top: 0;
}
.management-page > .page-header {
  margin-top: 32px;
}
@media (max-width: 600px) {
  .management-page {
    padding-top: 0;
  }
  .management-page > .page-header {
    margin-top: 24px;
  }
}
.dialog-card {
  display: flex;
  width: min(94vw, 620px);
  max-height: min(92vh, 760px);
  flex-direction: column;
  overflow: hidden;
  border-radius: 26px;
  box-shadow: 0 24px 70px rgba(55, 22, 34, 0.24);
}
.dialog-card > .dialog-header {
  flex: none;
}
.dialog-card > form {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}
.dialog-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 26px 20px;
  border-bottom: 1px solid #f1e8eb;
  background: linear-gradient(135deg, #fff 55%, #fff4f7);
}
.dialog-header > div {
  min-width: 0;
  flex: 1;
}
.dialog-header > div > small {
  color: #ad134e;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 1.3px;
}
.dialog-header h2 {
  margin: 2px 0 3px;
  font-size: 23px;
  line-height: 1.2;
}
.dialog-header p {
  margin: 0;
  color: #8d8185;
  font-size: 10px;
}
.dialog-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: none;
  place-items: center;
  border-radius: 15px;
  background: #f8e4eb;
  color: #ae154f;
  font-size: 23px;
}
.dialog-header > .q-btn {
  align-self: flex-start;
  color: #8c8084;
}
.dialog-form {
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  gap: 12px;
  padding: 22px 26px;
  scrollbar-color: #d9a8ba transparent;
  scrollbar-width: thin;
}
.dialog-form::-webkit-scrollbar {
  width: 6px;
}
.dialog-form::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: #d9a8ba;
}
.dialog-form::-webkit-scrollbar-track {
  background: transparent;
}
.service-dialog-card {
  width: min(94vw, 590px);
}
.service-dialog-card .dialog-header {
  background: linear-gradient(135deg, #fff 45%, #fff0f5);
}
.service-dialog-card .dialog-icon {
  background: linear-gradient(145deg, #a80f48, #d82e6c);
  color: #fff;
  box-shadow: 0 8px 18px rgba(174, 18, 78, 0.2);
}
.service-dialog-form {
  gap: 14px;
  padding-top: 18px;
}
.service-form-intro {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border: 1px solid #f0e2e7;
  border-radius: 15px;
  background: #fdf7f9;
}
.service-form-intro > span {
  display: grid;
  width: 36px;
  height: 36px;
  flex: none;
  place-items: center;
  border-radius: 11px;
  background: #f6dfe8;
  color: #ad134e;
  font-size: 18px;
}
.service-form-intro > div {
  display: flex;
  flex-direction: column;
}
.service-form-intro strong {
  font-size: 11px;
}
.service-form-intro small {
  color: #918589;
  font-size: 8px;
  line-height: 1.45;
}
.service-values-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 11px;
}
.service-dialog-form :deep(.q-field__control) {
  min-height: 54px;
  border-radius: 17px;
  transition: box-shadow 0.2s;
}
.service-dialog-form :deep(.q-field--focused .q-field__control) {
  box-shadow: 0 7px 19px rgba(173, 18, 77, 0.09);
}
.service-dialog-form :deep(.q-field__label) {
  font-size: 11px;
  font-weight: 600;
}
.service-dialog-form :deep(.q-field__bottom) {
  padding-left: 14px;
  font-size: 8px;
}
.field-unit {
  padding: 4px 7px;
  border-radius: 7px;
  background: #f5e7ec;
  color: #a4154d;
  font-size: 8px;
  font-weight: 800;
}
.category-selection {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 700;
}
.category-selection .q-icon {
  color: #ad134e;
  font-size: 17px;
}
:global(.service-category-menu) {
  margin-top: 6px;
  padding: 7px;
  border: 1px solid #eee1e6;
  border-radius: 17px;
  box-shadow: 0 17px 42px rgba(67, 27, 42, 0.16);
}
:global(.service-category-menu .category-option) {
  min-height: 49px;
  margin: 2px 0;
  border-radius: 12px;
  font-size: 11px;
}
:global(.service-category-menu .category-option:hover),
:global(.service-category-menu .category-option.q-manual-focusable--focused) {
  background: #fdf0f5;
  color: #a80f48;
}
:global(.service-category-menu .category-option .q-item__section--avatar) {
  min-width: 43px;
}
:global(.service-category-menu .category-option .q-item__section--avatar > span) {
  display: grid;
  width: 35px;
  height: 35px;
  place-items: center;
  border-radius: 11px;
  background: #f7e3ea;
  color: #ad134e;
  font-size: 17px;
}
.employee-dialog-form {
  gap: 22px;
}
.form-section {
  display: grid;
  gap: 11px;
}
.form-section + .form-section {
  padding-top: 20px;
  border-top: 1px solid #f1e9ec;
}
.form-section-title {
  display: flex;
  align-items: center;
  gap: 9px;
}
.form-section-title > .q-icon {
  display: grid;
  width: 31px;
  height: 31px;
  place-items: center;
  border-radius: 10px;
  background: #f8e8ee;
  color: #ad134e;
  font-size: 16px;
}
.form-section-title > div {
  display: flex;
  flex-direction: column;
}
.form-section-title strong {
  font-size: 12px;
}
.form-section-title small {
  color: #968a8e;
  font-size: 8px;
}
.dialog-form :deep(.q-field--outlined .q-field__control) {
  background: #fff;
}
.dialog-form :deep(.q-field__prepend) {
  color: #ae5676;
  font-size: 19px;
}
.dialog-form :deep(.q-chip) {
  background: #f8e5ec;
  color: #961344;
  font-size: 9px;
}
.professional-selects :deep(.q-field__control) {
  min-height: 55px;
  border-radius: 17px;
}
.professional-selection {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.professional-selection .q-icon {
  flex: none;
  color: #ad134e;
  font-size: 17px;
}
:global(.professional-options-menu) {
  max-height: 360px;
  margin-top: 6px;
  padding: 7px;
  border: 1px solid #eee1e6;
  border-radius: 17px;
  box-shadow: 0 17px 42px rgba(67, 27, 42, 0.16);
}
:global(.professional-options-menu .professional-option) {
  min-height: 55px;
  margin: 2px 0;
  padding: 6px 10px;
  border-radius: 12px;
  transition:
    background 0.18s,
    transform 0.18s;
}
:global(.professional-options-menu .professional-option:hover),
:global(.professional-options-menu .professional-option.q-manual-focusable--focused) {
  background: #fdf0f5;
  color: #a80f48;
  transform: translateX(2px);
}
:global(.professional-options-menu .professional-option .q-item__section--avatar) {
  min-width: 45px;
}
:global(.professional-options-menu .professional-option .q-item__section--avatar > span) {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 11px;
  background: #f7e3ea;
  color: #ad134e;
  font-size: 17px;
}
:global(.professional-options-menu .q-item__label) {
  font-size: 10px;
  font-weight: 700;
}
:global(.professional-options-menu .q-item__label--caption) {
  margin-top: 2px;
  color: #95898d;
  font-size: 7px;
  font-weight: 400;
}
.services-multiselect :deep(.q-field__control) {
  min-height: 58px;
  border-radius: 18px;
}
.services-multiselect :deep(.q-field__native) {
  gap: 5px;
  padding-block: 5px;
}
.service-selected-chip {
  height: 27px;
  margin: 2px 1px;
  padding-left: 8px;
  border: 1px solid #edc9d7;
  background: linear-gradient(135deg, #fff4f8, #f9e2eb) !important;
  color: #9f1047 !important;
  font-size: 8px !important;
  font-weight: 700;
}
.service-selected-chip .service-chip-icon {
  margin-right: 5px;
  color: #b01750;
  font-size: 13px;
}
.service-selected-chip :deep(.q-chip__icon--remove) {
  margin-left: 5px;
  color: #b36a85;
  font-size: 15px;
}
:global(.services-options-menu) {
  max-height: 350px;
  margin-top: 6px;
  padding: 7px;
  border: 1px solid #eee1e6;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 17px 42px rgba(67, 27, 42, 0.16);
  backdrop-filter: blur(15px);
}
:global(.services-options-menu .service-option) {
  min-height: 55px;
  margin: 2px 0;
  padding: 6px 10px;
  border-radius: 12px;
  transition:
    background 0.18s,
    transform 0.18s;
}
:global(.services-options-menu .service-option:hover),
:global(.services-options-menu .service-option.q-manual-focusable--focused) {
  background: #fdf0f5;
  color: #a80f48;
  transform: translateX(2px);
}
:global(.services-options-menu .q-item__section--avatar) {
  min-width: 46px;
}
:global(.services-options-menu .service-option-icon) {
  display: grid;
  width: 37px;
  height: 37px;
  place-items: center;
  border-radius: 12px;
  background: #f7e3ea;
  color: #ad134e;
  font-size: 18px;
}
:global(.services-options-menu .q-item__label) {
  font-size: 10px;
  font-weight: 700;
}
:global(.services-options-menu .q-item__label--caption) {
  margin-top: 2px;
  color: #95898d;
  font-size: 8px;
  font-weight: 400;
}
.photo-field {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 13px;
  border: 1px dashed #dfcbd3;
  border-radius: 17px;
  background: #fdfafb;
}
.photo-preview {
  position: relative;
  display: grid;
  width: 78px;
  height: 78px;
  flex: none;
  place-items: center;
  overflow: visible;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 24px;
  background: #f5e3ea;
  color: #b25577;
  box-shadow: 0 0 0 1px #ead9df;
  cursor: pointer;
}
.photo-preview > img {
  width: 100%;
  height: 100%;
  border-radius: 21px;
  object-fit: cover;
}
.salon-photo-preview {
  width: 132px;
  height: 88px;
  overflow: hidden;
  border-radius: 18px;
}
.salon-photo-preview > img {
  border-radius: 15px;
}
.photo-preview > .q-icon {
  font-size: 37px;
}
.photo-preview > span {
  position: absolute;
  right: -6px;
  bottom: -5px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 3px solid #fff;
  border-radius: 9px;
  background: #b31250;
  color: #fff;
  font-size: 13px;
}
.photo-field > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.photo-field > div > strong {
  font-size: 11px;
}
.photo-field > div > small {
  color: #968a8e;
  font-size: 8px;
}
.photo-actions {
  display: flex;
  gap: 5px;
  margin-top: 7px;
}
.photo-actions .q-btn {
  font-size: 8px;
}
.photo-field .photo-error {
  margin-top: 5px;
  color: #ba2938;
}
.dialog-actions {
  display: flex;
  flex: none;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 26px 24px !important;
  border-top: 1px solid #f1e8eb;
  background: #fdfafb;
}
.dialog-actions .dialog-secondary-action {
  min-width: 116px;
  height: 43px;
  padding-inline: 18px;
  color: #675b60;
  font-weight: 700;
}
.dialog-actions .dialog-secondary-action:hover {
  background: #f5edf0;
  color: #961344;
}
.dialog-actions .q-btn:last-child {
  min-width: 205px;
  height: 46px;
  font-weight: 800;
}
.dialog-actions .dialog-primary-action {
  background: linear-gradient(135deg, #a80f48, #d52967) !important;
  box-shadow: 0 9px 20px rgba(173, 18, 77, 0.22);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.dialog-actions .dialog-primary-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 25px rgba(173, 18, 77, 0.28);
}
.dialog-actions .dialog-primary-action :deep(.q-btn__content),
.dialog-actions .dialog-secondary-action :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 7px;
  white-space: nowrap;
}
.service-dialog-card .dialog-actions .q-btn:last-child {
  min-width: 190px;
  background: linear-gradient(135deg, #a80f48, #d52967) !important;
  box-shadow: 0 9px 20px rgba(173, 18, 77, 0.2);
}
@media (max-width: 600px) {
  .dialog-card,
  .salon-dialog-card {
    width: 100%;
    max-width: none;
    max-height: 94vh;
    border-radius: 24px 24px 0 0;
  }
  .dialog-header {
    padding: 19px 18px 16px;
  }
  .dialog-icon {
    width: 40px;
    height: 40px;
    border-radius: 13px;
    font-size: 20px;
  }
  .dialog-header h2 {
    font-size: 20px;
  }
  .dialog-header p {
    font-size: 9px;
  }
  .dialog-form {
    padding: 18px;
  }
  .employee-dialog-form {
    gap: 18px;
  }
  .form-section + .form-section {
    padding-top: 17px;
  }
  .dialog-actions {
    position: sticky;
    bottom: 0;
    flex-direction: row;
    padding: 12px 18px 16px !important;
  }
  .dialog-actions .q-btn {
    min-width: 0;
  }
  .dialog-actions .dialog-secondary-action {
    flex: 0.8 1 0;
    padding-inline: 10px;
  }
  .dialog-actions .dialog-primary-action {
    flex: 1.35 1 0;
    min-width: 0;
  }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .employee-dialog-form .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 440px) {
  .dialog-card {
    max-height: 96vh;
  }
  .dialog-header p {
    max-width: 250px;
  }
  .service-values-grid {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .service-form-intro {
    align-items: flex-start;
  }
  .photo-field {
    align-items: flex-start;
  }
  .photo-preview {
    width: 68px;
    height: 68px;
    border-radius: 21px;
  }
  .salon-photo-preview {
    width: 105px;
    height: 70px;
    border-radius: 17px;
  }
  .photo-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
:global(.shonga-success-toast),
:global(.shonga-error-toast) {
  min-width: min(360px, calc(100vw - 28px));
  padding: 12px 14px;
  border-radius: 16px;
  box-shadow: 0 16px 38px rgba(45, 24, 32, 0.22);
}
:global(.shonga-success-toast) {
  background: linear-gradient(135deg, #157347, #219a65) !important;
}
:global(.shonga-error-toast) {
  background: linear-gradient(135deg, #a92334, #d34251) !important;
}
:global(.shonga-success-toast .q-notification__message),
:global(.shonga-error-toast .q-notification__message) {
  font-size: 11px;
  font-weight: 800;
}
:global(.shonga-success-toast .q-notification__caption),
:global(.shonga-error-toast .q-notification__caption) {
  margin-top: 2px;
  font-size: 8px;
  opacity: 0.82;
}
</style>
